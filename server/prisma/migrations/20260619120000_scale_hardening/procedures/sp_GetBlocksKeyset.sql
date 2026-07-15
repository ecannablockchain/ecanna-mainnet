CREATE PROCEDURE [dbo].[sp_GetBlocksKeyset]
    @cursor BIGINT = NULL,
    @limit INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    SET @limit = CASE WHEN @limit < 1 THEN 25 WHEN @limit > 100 THEN 100 ELSE @limit END;

    SELECT TOP (@limit)
        [number], [hash], [parentHash], [timestamp], [gasUsed], [gasLimit], [miner], [txCount], [createdAt]
    FROM [dbo].[Block]
    WHERE (@cursor IS NULL OR [number] < @cursor)
    ORDER BY [number] DESC;
END;
