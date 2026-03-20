import express from 'express';
import cors from 'cors';
import { poolPromise, sql } from './db';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/leadtime', async (req, res) => {
    try {
        const { search, year } = req.query;
        const cleanSearch = (search || '').toString().trim().replace(/ /g, ''); // Trim and remove spaces from search term
        
        console.log(`Fetching Lead Time data... Search: "${cleanSearch}", Year: "${year || 'All'}"`);
        
        let yearFilter = '';
        if (year && year !== 'all') {
            yearFilter = `AND YEAR(TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE)) = ${year}`;
        }

        const searchQuery = cleanSearch 
            ? `AND (
                REPLACE(ISNULL(OP.C2_NUM, '') + ISNULL(OP.C2_ITEM, '') + ISNULL(OP.C2_SEQUEN, ''), ' ', '') LIKE '%${cleanSearch}%' 
                OR OP.C2_PRODUTO LIKE '%${cleanSearch}%'
               )`
            : '';

        let query = '';
        if (cleanSearch) {
            // Direct query for search mode - finds any matching OPs
            query = `
            WITH SelectedOPs AS (
                SELECT *
                FROM SC2010 OP
                WHERE OP.D_E_L_E_T_ = '' 
                  AND OP.C2_QUANT > 0
                  AND OP.C2_DATRF = ''
                  ${yearFilter}
                  ${searchQuery}
            )
            SELECT 
                ISNULL(OP.C2_NUM, '') + ISNULL(OP.C2_ITEM, '') + ISNULL(OP.C2_SEQUEN, '') AS NUM_OP,
                OP.C2_PRODUTO,
                OP.C2_QUANT AS QTD_OP,
                OP.C2_DATPRI AS DATA_INICIO,
                OP.C2_ROTEIRO AS COD_ROTEIRO,
                S.ZC_SIGLA,
                S.ZC_DIAS,
                CONVERT(VARCHAR, 
                    DATEADD(DAY, S.ZC_DIAS, TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE)), 
                    103) AS DATA_PREVISTA,
                S.ZC_DIAS AS LT_PREVISTO,
                DATEDIFF(DAY, 
                    TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE), 
                    TRY_CAST(NULLIF(LTRIM(RTRIM(ISNULL(MAX(H6.H6_DTAPONT), OP.C2_DATPRI))), '') AS DATE)
                ) AS LT_EXECUTADO,
                CASE 
                    WHEN DATEDIFF(DAY, TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE), TRY_CAST(NULLIF(LTRIM(RTRIM(ISNULL(MAX(H6.H6_DTAPONT), OP.C2_DATPRI))), '') AS DATE)) > S.ZC_DIAS 
                    THEN 'ATRASADO'
                    ELSE 'NO PRAZO'
                END AS STATUS_LT
            FROM SelectedOPs OP
            INNER JOIN SZC010 S ON (
                RTRIM(S.ZC_CODROT) = RTRIM(OP.C2_ROTEIRO) 
                AND RTRIM(S.ZC_PRODUTO) = RTRIM(OP.C2_PRODUTO) 
                AND S.D_E_L_E_T_ = ''
            )
            LEFT JOIN SH6010 H6 ON (
                H6.H6_OP = OP.C2_NUM + OP.C2_ITEM + OP.C2_SEQUEN
                AND H6.D_E_L_E_T_ = ''
            )
            GROUP BY 
                OP.C2_NUM, OP.C2_ITEM, OP.C2_SEQUEN, OP.C2_PRODUTO, 
                OP.C2_QUANT, OP.C2_DATPRI, OP.C2_ROTEIRO, S.ZC_SIGLA, S.ZC_DIAS
            ORDER BY OP.C2_NUM, OP.C2_ITEM, S.ZC_SIGLA;
            `;
        } else {
            // Subquery logic to find the 30 most delayed OPs
            query = `
            WITH TopOPs AS (
                SELECT TOP 30 *
                FROM SC2010 OP
                WHERE OP.D_E_L_E_T_ = '' 
                  AND OP.C2_QUANT > 0
                  AND OP.C2_DATRF = ''
                ${yearFilter}
                ORDER BY C2_DATPRI ASC
            )
            SELECT 
                ISNULL(OP.C2_NUM, '') + ISNULL(OP.C2_ITEM, '') + ISNULL(OP.C2_SEQUEN, '') AS NUM_OP,
                OP.C2_PRODUTO,
                OP.C2_QUANT AS QTD_OP,
                OP.C2_DATPRI AS DATA_INICIO,
                OP.C2_ROTEIRO AS COD_ROTEIRO,
                S.ZC_SIGLA,
                S.ZC_DIAS,
                CONVERT(VARCHAR, 
                    DATEADD(DAY, S.ZC_DIAS, TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE)), 
                    103) AS DATA_PREVISTA,
                S.ZC_DIAS AS LT_PREVISTO,
                DATEDIFF(DAY, 
                    TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE), 
                    TRY_CAST(NULLIF(LTRIM(RTRIM(ISNULL(MAX(H6.H6_DTAPONT), OP.C2_DATPRI))), '') AS DATE)
                ) AS LT_EXECUTADO,
                CASE 
                    WHEN DATEDIFF(DAY, TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE), TRY_CAST(NULLIF(LTRIM(RTRIM(ISNULL(MAX(H6.H6_DTAPONT), OP.C2_DATPRI))), '') AS DATE)) > S.ZC_DIAS 
                    THEN 'ATRASADO'
                    ELSE 'NO PRAZO'
                END AS STATUS_LT
            FROM TopOPs OP
            INNER JOIN SZC010 S ON (
                RTRIM(S.ZC_CODROT) = RTRIM(OP.C2_ROTEIRO) 
                AND RTRIM(S.ZC_PRODUTO) = RTRIM(OP.C2_PRODUTO) 
                AND S.D_E_L_E_T_ = ''
            )
            LEFT JOIN SH6010 H6 ON (
                H6.H6_OP = OP.C2_NUM + OP.C2_ITEM + OP.C2_SEQUEN
                AND H6.D_E_L_E_T_ = ''
            )
            GROUP BY 
                OP.C2_NUM, OP.C2_ITEM, OP.C2_SEQUEN, OP.C2_PRODUTO, 
                OP.C2_QUANT, OP.C2_DATPRI, OP.C2_ROTEIRO, S.ZC_SIGLA, S.ZC_DIAS
            ORDER BY OP.C2_NUM, OP.C2_ITEM, S.ZC_SIGLA;
            `;
        }

        console.time('QueryTime');
        const pool = await poolPromise;
        const result = await pool.request().query(query);
        console.timeEnd('QueryTime');
        console.log(`Results returned for Search: "${cleanSearch}", Year: "${year || 'All'}": ${result.recordset.length}`);
        res.json(result.recordset);
    } catch (err: any) {
        console.error('Query execution failed!');
        console.error('Error message:', err.message);
        console.error('Stack trace:', err.stack);
        res.status(500).json({ 
            error: 'Database Query Failed', 
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/years', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT YEAR(TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE)) as AvailableYear
            FROM SC2010 OP
            WHERE D_E_L_E_T_ = ''
              AND C2_QUANT > 0
              AND YEAR(TRY_CAST(NULLIF(LTRIM(RTRIM(OP.C2_DATPRI)), '') AS DATE)) IS NOT NULL
            ORDER BY AvailableYear DESC
        `;
        const pool = await poolPromise;
        const result = await pool.request().query(query);
        const years = result.recordset.map(r => r.AvailableYear.toString());
        res.json(years);
    } catch (err: any) {
        console.error('Error fetching years:', err);
        res.status(500).json({ error: 'Failed to fetch years' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
