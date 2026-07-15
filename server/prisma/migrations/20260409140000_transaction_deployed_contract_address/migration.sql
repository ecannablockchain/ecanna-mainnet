-- Link deployment txs to the created contract address (for verify form auto-fill).
IF COL_LENGTH(N'dbo.Transaction', N'deployedContractAddress') IS NULL
BEGIN
    ALTER TABLE [dbo].[Transaction] ADD [deployedContractAddress] NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'Transaction_deployedContractAddress_idx'
      AND object_id = OBJECT_ID(N'dbo.Transaction')
)
BEGIN
    CREATE NONCLUSTERED INDEX [Transaction_deployedContractAddress_idx]
    ON [dbo].[Transaction] ([deployedContractAddress]);
END;
