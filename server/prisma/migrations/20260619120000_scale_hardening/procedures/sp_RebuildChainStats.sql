CREATE PROCEDURE [dbo].[sp_RebuildChainStats]
AS
BEGIN
    SET NOCOUNT ON;
    MERGE [dbo].[ChainStats] AS t
    USING (
        SELECT
            1 AS [id],
            (SELECT COUNT_BIG(*) FROM [dbo].[Block]) AS [blockCount],
            (SELECT COUNT_BIG(*) FROM [dbo].[Transaction]) AS [txCount],
            (SELECT COUNT_BIG(*) FROM [dbo].[TokenTransfer]) AS [transferCount]
    ) AS s
    ON t.[id] = s.[id]
    WHEN MATCHED THEN
        UPDATE SET
            [blockCount] = s.[blockCount],
            [txCount] = s.[txCount],
            [transferCount] = s.[transferCount],
            [updatedAt] = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT ([id], [blockCount], [txCount], [transferCount])
        VALUES (s.[id], s.[blockCount], s.[txCount], s.[transferCount]);
END;
