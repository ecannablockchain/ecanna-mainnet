CREATE PROCEDURE [dbo].[sp_UpsertHourlyTxStats]
    @bucket DATETIME2,
    @delta INT
AS
BEGIN
    SET NOCOUNT ON;
    MERGE [dbo].[HourlyTxStats] AS t
    USING (SELECT @bucket AS [bucket]) AS s
    ON t.[bucket] = s.[bucket]
    WHEN MATCHED THEN
        UPDATE SET [txCount] = t.[txCount] + @delta
    WHEN NOT MATCHED THEN
        INSERT ([bucket], [txCount]) VALUES (s.[bucket], @delta);
END;
