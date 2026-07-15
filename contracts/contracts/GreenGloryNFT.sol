// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Green Glory NFT (GGN) — ERC-20 on ECNA (Paris EVM)
/// @notice Full name: Green Glory NFT | Symbol: GGN | Initial supply minted to owner at deploy
contract GreenGloryNFT is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    constructor(address initialOwner, uint256 initialSupply)
        ERC20("Green Glory NFT", "GGN")
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
