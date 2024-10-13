const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const logger = require('./logger')

const app = express()

app.use(cors())

app.use(express.json()) // Middleware pro analýzu JSON dat

// Konfigurace připojení k PostgreSQL
const db = new Pool({
    user: 'postgres', // vaše PostgreSQL uživatelské jméno
    host: 'localhost', // hostitel, kde běží PostgreSQL
    database: 'Personal_DB', // jméno vaší databáze
    password: 'postgres', // vaše heslo k databázi
    port: 5432 // port, na kterém běží PostgreSQL (standardní je 5432)
})

// Middleware pro ověřování Bearer tokenu
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'] // Získání Authorization hlavičky
    const token = authHeader // Získání samotného tokenu

    if (!token) {
        return res.status(401).json({ error: 'No token provided' })
    }

    // Tady byste normálně ověřovali token, například pomocí JWT
    // Např. jwt.verify(token, 'your-secret-key', (err, user) => { ... });
    // Pro jednoduchost zatím jen zkontrolujeme, zda je token rovný nějaké pevné hodnotě (v reálném světě byste token dešifrovali)
    if (token === 'Martin') {
        next() // Pokud je token platný, pokračujte na další middleware nebo routu
    } else {
        res.status(403).json({ error: 'Invalid token' })
    }
}

app.get('/api/items', authenticateToken, async (req, res) => {
    logger.info(`/api/items GET, body: {orderBy: ${req.body.orderBy || null}, limit: ${req.body.limit || null}, offset: ${req.body.offset || null} }`)

    // Získání hodnot limitu a offsetu z těla požadavku
    let { orderBy = '-id', limit = 10, offset = 0 } = req.body

    // Kontrola platnosti limitu a offsetu
    if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'Limit must be a positive integer.' })
    }

    if (isNaN(offset) || offset < 0) {
        return res.status(400).json({ error: 'Offset must be a non-negative integer.' })
    }

    try {
        orderBy = orderBy === '' ? '-id' : orderBy

        const prefixes = new Set(['+', '-'])

        if (orderBy.includes('name')) {
            orderBy = `COALESCE(CAST(SUBSTRING(i.name FROM '[0-9]+') AS INTEGER), 0) ${orderBy.startsWith('+') ? 'DESC' : 'ASC'}`
        } else {
            orderBy = `${prefixes.has(orderBy[0]) ? orderBy.slice(1) : orderBy} ${orderBy.startsWith('+') ? 'DESC' : 'ASC'}`
        }

        let query
        if (req.query.withView === 'true') {
            query = `
                SELECT * FROM cbos.v_items
                ORDER BY ${orderBy}
                ${limit ? ` LIMIT ${limit}` : ''}
                ${offset ? ` OFFSET ${offset}` : ''}
            `
        } else {
            query = `
                SELECT i.id,
                i.name,
                cg.cgroup_id,
                cg.name AS central_group_name,
                vg.vat_id,
                vg.name AS vat_name,
                ccg.ccs_id,
                ccg.name AS ccs_name,
                i.price,
                i.created,
                i.updated
                FROM cbos.items i
                JOIN cbos.central_groups cg ON cg.cgroup_id = i.cgroup_id
                JOIN cbos.vat_groups vg ON vg.vat_id = i.vat_id
                JOIN cbos.ccs_groups ccg ON ccg.ccs_id = i.ccs_id
                ORDER BY ${orderBy}
                ${limit ? ` LIMIT ${limit}` : ''}
                ${offset ? ` OFFSET ${offset}` : ''}
            `
        }

        console.log(query)
        const result = await db.query(query)

        // Odeslání výsledku jako JSON odpověď
        res.json(result.rows) // result.rows obsahuje všechny načtené řádky
    } catch (error) {
        console.error('Error fetching data from PostgreSQL', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

let currentProgress = {
    percentage: 0,
    insertedRecords: 0,
    totalRecords: 0,
    status: false
}

app.get('/api/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const sendProgress = (progress) => {
        const { status, totalRecords, ...dataWithoutStatus } = progress // Destrukturování a odstranění status
        res.write(`data: ${JSON.stringify(dataWithoutStatus)}\n\n`)
    }

    try {
        // Simulace odesílání aktuálního stavu, dokud nebude stav dokončen
        const intervalId = setInterval(() => {
            if (!currentProgress.status) {
                res.write('Proces nyní není aktivní\n\n')
                clearInterval(intervalId) // Ukončení intervalu
                if (!res.writableEnded) {
                    res.end() // Ukončení spojení, pokud ještě nebylo ukončeno
                }
                return
            }

            // Odeslání aktuálního stavu
            sendProgress(currentProgress)

            // Kontrola na dokončení
            if (currentProgress.percentage >= 100) {
                // res.write('Proces byl dokončen')
                clearInterval(intervalId) // Zastavení intervalu
                currentProgress.status = false // Změna stavu na neaktivní
                if (!res.writableEnded) {
                    res.end() // Ukončení spojení po dosažení 100 %, pokud ještě nebylo ukončeno
                }
            }
        }, 1000)
    } catch (error) {
        console.error('Error in progress stream:', error)
        if (!res.writableEnded) {
            res.end() // Ukončení spojení při chybě
        }
    }
})

app.post('/api/items', authenticateToken, async (req, res) => {
    logger.info(`/api/items POST, body: {tableName: ${req.body?.tableName}, numOfRecords: ${req.body?.numOfRecords} }`)
    try {
        if (!req.body.tableName || !req.body.numOfRecords) {
            res.status(409).json({ error: 'data in body are not correct' })
        }

        const table = req.body.tableName
        const numOfRecords = req.body.numOfRecords // Počet záznamů, které chci vložit

        const totalCountResult = await db.query(`SELECT COUNT(*) FROM cbos.${table}`) // Počet všech záznamů
        let value = parseInt(totalCountResult.rows[0].count, 10) > 0 ? parseInt(totalCountResult.rows[0].count, 10) + 1 : table == 'items' ? 1 : 0 // Získání počtu záznamů + nastavení min. id

        currentProgress = {
            percentage: 0, // Reset stavu na začátku operace
            insertedRecords: 0,
            totalRecords: numOfRecords,
            status: true // Aktivní stav pro odesílání stavu
        }

        await db.query('BEGIN')

        for (let i = 1; i <= numOfRecords; i++) {
            if (table === 'items') {
                const name = `test${value}` // 'test' + hodnota proměnné
                const vat_id = Math.floor(Math.random() * 50) // Náhodné číslo pro vat_id
                const ccs_id = Math.floor(Math.random() * 50) // Náhodné číslo pro ccs_id
                const cgroup_id = Math.floor(Math.random() * 20) // Náhodné číslo pro cgroup_id
                const price = Math.floor(Math.random() * 10000) // Náhodné číslo pro price
                const commentary = `Komentář pro ${name}` // 'Komentář pro' + name

                // Vložení dynamicky vygenerovaných dat do tabulky
                await db.query(
                    `INSERT INTO cbos.${table} (name, vat_id, ccs_id, commentary, created, updated, cgroup_id, price)
               VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6) RETURNING *`,
                    [name, vat_id, ccs_id, commentary, cgroup_id, price]
                )

                // Aktualizace stavu
                currentProgress.insertedRecords = i // Aktualizace počtu vložených záznamů
                currentProgress.percentage = Math.floor((i / numOfRecords) * 100) // Aktualizace procent

                if (numOfRecords <= 1000) {
                    if (i % 100 === 0) {
                        const remainingRecords = numOfRecords - i // Výpočet zbývajících záznamů
                        logger.info(`${i} inserted. Remaining: ${remainingRecords}`)
                        await db.query('COMMIT') // Potvrzení transakce
                        await db.query('BEGIN') // Začátek nové transakce
                    }
                }

                if (numOfRecords > 1000 && numOfRecords <= 50000) {
                    if (i % 1000 === 0) {
                        const remainingRecords = numOfRecords - i // Výpočet zbývajících záznamů
                        logger.info(`${i} inserted. Remaining: ${remainingRecords}`)
                        await db.query('COMMIT') // Potvrzení transakce
                        await db.query('BEGIN') // Začátek nové transakce
                    }
                }

                if (numOfRecords > 50000 && numOfRecords <= 250000) {
                    if (i % 5000 === 0) {
                        const remainingRecords = numOfRecords - i // Výpočet zbývajících záznamů
                        logger.info(`${i} inserted. Remaining: ${remainingRecords}`)
                        await db.query('COMMIT') // Potvrzení transakce
                        await db.query('BEGIN') // Začátek nové transakce
                    }
                }

                if (numOfRecords > 250000) {
                    if (i % 10000 === 0) {
                        const remainingRecords = numOfRecords - i // Výpočet zbývajících záznamů
                        logger.info(`${i} inserted. Remaining: ${remainingRecords}`)
                        await db.query('COMMIT') // Potvrzení transakce
                        await db.query('BEGIN') // Začátek nové transakce
                    }
                }
            }
            if (table === 'central_groups') {
                const name = `skupina - ${value}` // 'test' + hodnota proměnné
                const cgroup_id = value

                // Vložení dynamicky vygenerovaných dat do tabulky
                const result = await db.query(
                    `INSERT INTO cbos.${table} (name, cgroup_id, created, updated)
                VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
                    [name, cgroup_id]
                )
            }
            if (table === 'vat_groups') {
                const name = `vat_skupina - ${value}` // 'test' + hodnota proměnné
                const vat_id = value

                // Vložení dynamicky vygenerovaných dat do tabulky
                await db.query(
                    `INSERT INTO cbos.${table} (name, vat_id, created, updated)
                VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
                    [name, vat_id]
                )
            }
            if (table === 'ccs_groups') {
                const name = `ccs_skupina - ${value}` // 'test' + hodnota proměnné
                const ccs_id = value

                // Vložení dynamicky vygenerovaných dat do tabulky
                const result = await db.query(
                    `INSERT INTO cbos.${table} (name, ccs_id, created, updated)
                VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
                    [name, ccs_id]
                )
            }

            value++
        }

        // Potvrzení poslední transakce
        await db.query('COMMIT')

        // Vrácení odpovědi
        res.status(201).json({ message: `${numOfRecords} records inserted successfully` })
    } catch (error) {
        await db.query('ROLLBACK')
        console.error('Error inserting data into PostgreSQL', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

app.listen(3000, () => {
    console.log('Server is running on port 3000')
})
