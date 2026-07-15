-- Scale hardening for 90M+ blocks (SQL Server) — tables + indexes.
-- Stored procedures: procedures/*.sql (applied by npm run db:apply-scale)

BEGIN TRY
BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[ChainStats]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ChainStats] (
        [id] INT NOT NULL CONSTRAINT [ChainStats_pkey] PRIMARY KEY CLUSTERED,
        [blockCount] BIGINT NOT NULL CONSTRAINT [ChainStats_blockCount_df] DEFAULT 0,
        [txCount] BIGINT NOT NULL CONSTRAINT [ChainStats_txCount_df] DEFAULT 0,
        [transferCount] BIGINT NOT NULL CONSTRAINT [ChainStats_transferCount_df] DEFAULT 0,
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ChainStats_updatedAt_df] DEFAULT SYSUTCDATETIME()
    );
    INSERT INTO [dbo].[ChainStats] ([id], [blockCount], [txCount], [transferCount])
    VALUES (
        1,
        (SELECT COUNT_BIG(*) FROM [dbo].[Block]),
        (SELECT COUNT_BIG(*) FROM [dbo].[Transaction]),
        (SELECT COUNT_BIG(*) FROM [dbo].[TokenTransfer])
    );
END;

IF OBJECT_ID(N'[dbo].[HourlyTxStats]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HourlyTxStats] (
        [bucket] DATETIME2 NOT NULL CONSTRAINT [HourlyTxStats_pkey] PRIMARY KEY CLUSTERED,
        [txCount] INT NOT NULL CONSTRAINT [HourlyTxStats_txCount_df] DEFAULT 0
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Block_timestamp_idx' AND object_id = OBJECT_ID(N'[dbo].[Block]'))
    CREATE NONCLUSTERED INDEX [Block_timestamp_idx] ON [dbo].[Block]([timestamp]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Block_miner_number_idx' AND object_id = OBJECT_ID(N'[dbo].[Block]'))
    CREATE NONCLUSTERED INDEX [Block_miner_number_idx] ON [dbo].[Block]([miner], [number] DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Transaction_from_blockNumber_idx' AND object_id = OBJECT_ID(N'[dbo].[Transaction]'))
    CREATE NONCLUSTERED INDEX [Transaction_from_blockNumber_idx] ON [dbo].[Transaction]([from], [blockNumber] DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Transaction_to_blockNumber_idx' AND object_id = OBJECT_ID(N'[dbo].[Transaction]'))
    CREATE NONCLUSTERED INDEX [Transaction_to_blockNumber_idx] ON [dbo].[Transaction]([to], [blockNumber] DESC) WHERE [to] IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'TokenTransfer_token_txHash_idx' AND object_id = OBJECT_ID(N'[dbo].[TokenTransfer]'))
    CREATE NONCLUSTERED INDEX [TokenTransfer_token_txHash_idx] ON [dbo].[TokenTransfer]([token], [txHash]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'GasSnapshot_blockNum_idx' AND object_id = OBJECT_ID(N'[dbo].[GasSnapshot]'))
    CREATE NONCLUSTERED INDEX [GasSnapshot_blockNum_idx] ON [dbo].[GasSnapshot]([blockNum] DESC);

COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH;
