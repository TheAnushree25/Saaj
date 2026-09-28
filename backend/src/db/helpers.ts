/**
 * insert/update ... returning() always gives back an array. When exactly one
 * row must come back, this returns it, and fails loudly if Postgres returned none.
 */
export function one<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error("Expected the query to return a row");
  return row;
}
