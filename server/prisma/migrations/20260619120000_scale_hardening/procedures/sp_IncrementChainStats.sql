CREATE PROCEDURE [dbo].[sp_IncrementChainStats]
    @blocks BIGINT = 0,
    @txs BIGINT = 0,
    @transfers BIGINT = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM [dbo].[ChainStats] WHERE [id] = 1)
        INSERT INTO [dbo].[ChainStats] ([id], [blockCount], [txCount], [transferCount])
        VALUES (1, @blocks, @txs, @transfers);
    ELSE
        UPDATE [dbo].[ChainStats]
        SET [blockCount] = [blockCount] + @blocks,
            [txCount] = [txCount] + @txs,
            [transferCount] = [transferCount] + @transfers,
            [updatedAt] = SYSUTCDATETIME()
        WHERE [id] = 1;
END;
