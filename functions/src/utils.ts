export const PayloadError = () => 'Bad request body. Check app/src/types/api.'
export const DatabaseError = (type: string) =>
    `Error writing ${type} to database.`
export const DuplicateAlias = () =>
    "There is already a player with that alias"
export const NotFoundError = () =>
    "Not found. The document request wasn't found."