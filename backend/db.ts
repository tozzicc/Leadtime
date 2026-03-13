import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
    user: 'consulta',
    password: 'fastcon0321',
    database: 'PROTHEUS_PRODUCAO',
    server: '10.211.0.4',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
};

export const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
    })
    .catch(err => {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
    });

export { sql };
