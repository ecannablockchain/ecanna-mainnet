// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Remix smoke test — no imports; deploy this first on ECNA to verify MetaMask + gas.
/// @notice REMIX (zaroori): Solidity Compiler → Advanced → EVM version = **paris** (ya london).
/// Default "shanghai"/cancun bytecode uses opcode PUSH0 — ECNA chain par Geth error: invalid opcode PUSH0,
/// isliye "Gas estimation failed" / missing revert data aata hai. Paris = deploy chalega.
contract RemixSmokeTest {
    uint256 public value;

    event Set(uint256 indexed v);

    function set(uint256 v) external {
        value = v;
        emit Set(v);
    }
}
