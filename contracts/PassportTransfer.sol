// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PassportRegistry.sol";

/// @title PassportTransfer
/// @notice Gère le transfert de propriété d'un passeport entre adresses.
/// @dev Vérifie que le caller (ou le signataire d'un meta-tx) est l'owner courant.
///      Met à jour le PassportRegistry et journalise dans PassportEvent.
contract PassportTransfer is Ownable, ReentrancyGuard {
    PassportRegistry public immutable registry;

    event OwnershipTransferred(
        bytes32 indexed fingerprintHash,
        address indexed from,
        address indexed to,
        uint64 timestamp
    );

    error NotCurrentOwner();
    error SameOwner();
    error InvalidRecipient();

    constructor(address registryAddress, address initialOwner) Ownable(initialOwner) {
        registry = PassportRegistry(registryAddress);
    }

    /// @notice Transfère la propriété — appelé par le owner courant ou un opérateur autorisé.
    function transfer(bytes32 fingerprintHash, address to) external nonReentrant {
        if (to == address(0)) revert InvalidRecipient();

        PassportRegistry.Passport memory p = registry.getPassport(fingerprintHash);

        if (p.owner != msg.sender) revert NotCurrentOwner();
        if (p.owner == to) revert SameOwner();

        registry._setOwner(fingerprintHash, to);

        emit OwnershipTransferred(fingerprintHash, p.owner, to, uint64(block.timestamp));
    }

    /// @notice Transfert admin (par exemple lors d'une vente sur Art-Core marketplace).
    /// @dev Le backend signe la transaction avec une clé custodienne tant que les wallets utilisateurs ne sont pas en place.
    function transferAsAdmin(bytes32 fingerprintHash, address from, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidRecipient();
        PassportRegistry.Passport memory p = registry.getPassport(fingerprintHash);
        if (p.owner != from) revert NotCurrentOwner();
        if (from == to) revert SameOwner();

        registry._setOwner(fingerprintHash, to);
        emit OwnershipTransferred(fingerprintHash, from, to, uint64(block.timestamp));
    }
}
