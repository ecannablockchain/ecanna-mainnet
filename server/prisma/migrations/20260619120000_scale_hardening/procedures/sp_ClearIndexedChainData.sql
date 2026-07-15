CREATE PROCEDURE [dbo].[sp_ClearIndexedChainData]
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    DELETE FROM [dbo].[TokenTransfer];
    DELETE FROM [dbo].[Transaction];
    DELETE FROM [dbo].[GasSnapshot];
    DELETE FROM [dbo].[Block];
    DELETE FROM [dbo].[HourlyTxStats];
    IF EXISTS (SELECT 1 FROM [dbo].[ChainStats] WHERE [id] = 1)
        UPDATE [dbo].[ChainStats]
        SET [blockCount] = 0, [txCount] = 0, [transferCount] = 0, [updatedAt] = SYSUTCDATETIME()
        WHERE [id] = 1;
    ELSE
        INSERT INTO [dbo].[ChainStats] ([id], [blockCount], [txCount], [transferCount]) VALUES (1, 0, 0, 0);
    COMMIT TRAN;
END;
