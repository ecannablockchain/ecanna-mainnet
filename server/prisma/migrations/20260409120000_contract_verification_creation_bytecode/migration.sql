-- MS SQL Server: optional deployment metadata (BscScan-style creation code + constructor args).
-- Idempotent: safe to run more than once.
IF COL_LENGTH(N'dbo.ContractVerification', N'creationTxInput') IS NULL
BEGIN
    ALTER TABLE [dbo].[ContractVerification] ADD [creationTxInput] NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.ContractVerification', N'compilerCreationBytecode') IS NULL
BEGIN
    ALTER TABLE [dbo].[ContractVerification] ADD [compilerCreationBytecode] NVARCHAR(MAX) NULL;
END;
