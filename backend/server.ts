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
                    103) AS DATA_PREVISTA
            FROM SC2010 OP
            INNER JOIN SZC010 S ON (
                RTRIM(S.ZC_CODROT) = RTRIM(OP.C2_ROTEIRO) 
                AND RTRIM(S.ZC_PRODUTO) = RTRIM(OP.C2_PRODUTO) 
                AND S.D_E_L_E_T_ = ''
            )
            WHERE OP.D_E_L_E_T_ = '' 
              AND OP.C2_QUANT > 0
              ${yearFilter}
              ${searchQuery}
            ORDER BY OP.C2_DATPRI ASC, S.ZC_DIAS ASC;
            `;
        } else {
            // Subquery logic to find the 30 most delayed OPs
            query = `
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
                    103) AS DATA_PREVISTA
            FROM SC2010 OP
            INNER JOIN SZC010 S ON (
                RTRIM(S.ZC_CODROT) = RTRIM(OP.C2_ROTEIRO) 
                AND RTRIM(S.ZC_PRODUTO) = RTRIM(OP.C2_PRODUTO) 
                AND S.D_E_L_E_T_ = ''
            )
            WHERE (RTRIM(ISNULL(OP.C2_NUM, '')) + RTRIM(ISNULL(OP.C2_ITEM, '')) + RTRIM(ISNULL(OP.C2_SEQUEN, ''))) IN (
                SELECT TOP 30 (RTRIM(ISNULL(C2_NUM, '')) + RTRIM(ISNULL(C2_ITEM, '')) + RTRIM(ISNULL(C2_SEQUEN, '')))
                FROM SC2010 OP
                WHERE D_E_L_E_T_ = '' AND C2_QUANT > 0
                ${yearFilter}
                ORDER BY C2_DATPRI ASC
            )
            ORDER BY OP.C2_DATPRI ASC, S.ZC_DIAS ASC;
            `;
        }

        console.time('QueryTime');
        const pool = await poolPromise;
        const result = await pool.request().query(query);
        console.timeEnd('QueryTime');
        console.log(`Results returned for Search: "${cleanSearch}", Year: "${year || 'All'}": ${result.recordset.length}`);
        res.json(result.recordset);
    } catch (err: any) {
        console.error('Query execution failed: ', err);
        res.status(500).json({ error: err.message || 'Server Error', details: err });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
