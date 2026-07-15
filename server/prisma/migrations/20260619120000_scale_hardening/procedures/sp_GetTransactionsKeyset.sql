CREATE PROCEDURE [dbo].[sp_GetTransactionsKeyset]
    @cursorBlock BIGINT = NULL,
    @cursorTxIndex INT = NULL,
    @limit INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    SET @limit = CASE WHEN @limit < 1 THEN 25 WHEN @limit > 100 THEN 100 ELSE @limit END;

    SELECT TOP (@limit)
        t.[id], t.[hash], t.[blockNumber], t.[blockHash], t.[transactionIndex],
        t.[from], t.[to], t.[value], t.[gasPrice], t.[gasUsed], t.[status],
        t.[input], t.[nonce], t.[deployedContractAddress], t.[createdAt],
        b.[timestamp] AS [blockTimestamp]
    FROM [dbo].[Transaction] t
    INNER JOIN [dbo].[Block] b ON t.[blockNumber] = b.[number]
    WHERE (
        @cursorBlock IS NULL
        OR t.[blockNumber] < @cursorBlock
        OR (t.[blockNumber] = @cursorBlock AND t.[transactionIndex] < ISNULL(@cursorTxIndex, 2147483647))
    )
    ORDER BY t.[blockNumber] DESC, t.[transactionIndex] DESC;
END;
