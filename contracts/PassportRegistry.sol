// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PassportRegistry
/// @notice Source of truth pour l'enregistrement des passeports d'œuvres d'art.
/// @dev Mappe une empreinte numérique (SHA256 hash 32 bytes) à un Passport.
///      Le hash est calculé off-chain par Pass-Core à partir des macro-photos
///      + métadonnées canoniques de l'œuvre.
contract PassportRegistry is Ownable {
    struct Passport {
        address owner;          // propriétaire courant
        uint64  createdAt;      // unix timestamp
        uint8   status;         // 0=draft, 1=certified, 2=revoked
        bytes32 metadataHash;   // hash off-chain (IPFS CID ou similaire)
    }

    /// @notice Mapping fingerprintHash → Passport.
    mapping(bytes32 => Passport) private _passports;

    /// @notice Emis à chaque nouvel enregistrement.
    event PassportRegistered(bytes32 indexed fingerprintHash, address indexed owner, uint64 createdAt);
    /// @notice Emis lors d'une révocation admin (objet contrefait, etc.).
    event PassportRevoked(bytes32 indexed fingerprintHash, address indexed admin);

    error AlreadyRegistered();
    error NotRegistered();
    error InvalidOwner();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Enregistre un nouveau passeport.
    /// @param fingerprintHash empreinte SHA256 calculée off-chain
    /// @param newOwner propriétaire initial (généralement l'artiste)
    /// @param metadataHash hash IPFS des métadonnées canoniques
    function register(bytes32 fingerprintHash, address newOwner, bytes32 metadataHash) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        if (_passports[fingerprintHash].createdAt != 0) revert AlreadyRegistered();

        _passports[fingerprintHash] = Passport({
            owner: newOwner,
            createdAt: uint64(block.timestamp),
            status: 1,
            metadataHash: metadataHash
        });

        emit PassportRegistered(fingerprintHash, newOwner, uint64(block.timestamp));
    }

    /// @notice Récupère un passeport par son empreinte.
    function getPassport(bytes32 fingerprintHash) external view returns (Passport memory) {
        Passport memory p = _passports[fingerprintHash];
        if (p.createdAt == 0) revert NotRegistered();
        return p;
    }

    /// @notice Existe-t-il un passeport actif pour ce hash ?
    function exists(bytes32 fingerprintHash) external view returns (bool) {
        return _passports[fingerprintHash].createdAt != 0;
    }

    /// @notice Révoque un passeport (contrefaçon avérée, doublon, etc.).
    function revoke(bytes32 fingerprintHash) external onlyOwner {
        if (_passports[fingerprintHash].createdAt == 0) revert NotRegistered();
        _passports[fingerprintHash].status = 2;
        emit PassportRevoked(fingerprintHash, msg.sender);
    }

    /// @notice Met à jour le owner — utilisé par PassportTransfer via délégation.
    /// @dev À protéger par un AccessControl plus fin en prod (rôle TRANSFER_AGENT).
    function _setOwner(bytes32 fingerprintHash, address newOwner) external onlyOwner {
        if (_passports[fingerprintHash].createdAt == 0) revert NotRegistered();
        if (newOwner == address(0)) revert InvalidOwner();
        _passports[fingerprintHash].owner = newOwner;
    }
}
