import snowflake from 'snowflake-sdk'

interface ConnectionOverrides {
  database?: string
  warehouse?: string
  schema?: string
}

function getConnection(overrides: ConnectionOverrides = {}) {
  const account = process.env.SNOWFLAKE_ACCOUNT
  const username = process.env.SNOWFLAKE_USER
  const token = process.env.SNOWFLAKE_TOKEN

  if (!account || !username || !token) {
    throw new Error('Snowflake credentials not configured (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_TOKEN)')
  }

  return snowflake.createConnection({
    account,
    username,
    authenticator: 'PROGRAMMATIC_ACCESS_TOKEN',
    token,
    warehouse: overrides.warehouse || undefined,
    database: overrides.database || undefined,
    schema: overrides.schema || undefined,
  })
}

export function runQuery(sql: string, overrides: ConnectionOverrides = {}): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const conn = getConnection(overrides)
    conn.connect((err) => {
      if (err) { reject(new Error(`Connection failed: ${err.message}`)); return }
      conn.execute({
        sqlText: sql,
        complete: (execErr, _stmt, rows) => {
          conn.destroy(() => {})
          if (execErr) { reject(new Error(execErr.message)); return }
          resolve((rows ?? []) as Record<string, unknown>[])
        },
      })
    })
  })
}
