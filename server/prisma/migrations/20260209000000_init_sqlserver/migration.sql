BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Block] (
    [number] BIGINT NOT NULL,
    [hash] NVARCHAR(1000) NOT NULL,
    [parentHash] NVARCHAR(1000) NOT NULL,
    [timestamp] DATETIME2 NOT NULL,
    [gasUsed] NVARCHAR(1000) NOT NULL,
    [gasLimit] NVARCHAR(1000) NOT NULL,
    [miner] NVARCHAR(1000) NOT NULL,
    [txCount] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Block_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Block_pkey] PRIMARY KEY CLUSTERED ([number])
);

-- CreateTable
CREATE TABLE [dbo].[Transaction] (
    [id] NVARCHAR(1000) NOT NULL,
    [hash] NVARCHAR(1000) NOT NULL,
    [blockNumber] BIGINT NOT NULL,
    [blockHash] NVARCHAR(1000) NOT NULL,
    [transactionIndex] INT NOT NULL CONSTRAINT [Transaction_transactionIndex_df] DEFAULT 0,
    [from] NVARCHAR(1000) NOT NULL,
    [to] NVARCHAR(1000),
    [value] NVARCHAR(1000) NOT NULL,
    [gasPrice] NVARCHAR(1000),
    [gasUsed] NVARCHAR(1000),
    [status] INT NOT NULL,
    [input] NVARCHAR(max) NOT NULL CONSTRAINT [Transaction_input_df] DEFAULT '0x',
    [nonce] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Transaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Transaction_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Transaction_hash_key] UNIQUE NONCLUSTERED ([hash])
);

-- CreateTable
CREATE TABLE [dbo].[TokenTransfer] (
    [id] NVARCHAR(1000) NOT NULL,
    [txHash] NVARCHAR(1000) NOT NULL,
    [logIndex] INT NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [from] NVARCHAR(1000) NOT NULL,
    [to] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TokenTransfer_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TokenTransfer_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TokenTransfer_txHash_logIndex_key] UNIQUE NONCLUSTERED ([txHash],[logIndex])
);

-- CreateTable
CREATE TABLE [dbo].[ContractVerification] (
    [id] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [contractName] NVARCHAR(1000) NOT NULL,
    [compilerKind] NVARCHAR(1000) NOT NULL CONSTRAINT [ContractVerification_compilerKind_df] DEFAULT 'solidity-single-file',
    [compilerVersion] NVARCHAR(1000) NOT NULL,
    [optimization] BIT NOT NULL,
    [runs] INT NOT NULL CONSTRAINT [ContractVerification_runs_df] DEFAULT 200,
    [evmVersion] NVARCHAR(1000) NOT NULL CONSTRAINT [ContractVerification_evmVersion_df] DEFAULT 'cancun',
    [exactBytecodeMatch] BIT NOT NULL CONSTRAINT [ContractVerification_exactBytecodeMatch_df] DEFAULT 0,
    [openSourceLicense] NVARCHAR(1000) NOT NULL CONSTRAINT [ContractVerification_openSourceLicense_df] DEFAULT 'MIT',
    [sourceCode] NVARCHAR(max) NOT NULL,
    [abi] NVARCHAR(max) NOT NULL,
    [verifiedAt] DATETIME2 NOT NULL CONSTRAINT [ContractVerification_verifiedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ContractVerification_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContractVerification_address_key] UNIQUE NONCLUSTERED ([address])
);

-- CreateTable
CREATE TABLE [dbo].[GasSnapshot] (
    [id] NVARCHAR(1000) NOT NULL,
    [blockNum] BIGINT NOT NULL,
    [baseFee] NVARCHAR(1000),
    [gasUsed] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [GasSnapshot_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [GasSnapshot_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[IndexerState] (
    [id] INT NOT NULL CONSTRAINT [IndexerState_id_df] DEFAULT 1,
    [lastBlock] BIGINT NOT NULL,
    CONSTRAINT [IndexerState_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_from_idx] ON [dbo].[Transaction]([from]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_to_idx] ON [dbo].[Transaction]([to]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_blockNumber_idx] ON [dbo].[Transaction]([blockNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Transaction_blockNumber_transactionIndex_idx] ON [dbo].[Transaction]([blockNumber], [transactionIndex]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TokenTransfer_token_idx] ON [dbo].[TokenTransfer]([token]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TokenTransfer_from_idx] ON [dbo].[TokenTransfer]([from]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TokenTransfer_to_idx] ON [dbo].[TokenTransfer]([to]);

-- AddForeignKey
ALTER TABLE [dbo].[Transaction] ADD CONSTRAINT [Transaction_blockNumber_fkey] FOREIGN KEY ([blockNumber]) REFERENCES [dbo].[Block]([number]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TokenTransfer] ADD CONSTRAINT [TokenTransfer_txHash_fkey] FOREIGN KEY ([txHash]) REFERENCES [dbo].[Transaction]([hash]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
