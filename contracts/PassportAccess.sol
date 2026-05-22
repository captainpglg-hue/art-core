// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PassportAccess
/// @notice Gère les permissions fines d'accès aux passeports : qui peut voir quoi.
/// @dev Rôles : ADMIN, EXPERT (expert certifié, peut consulter le détail privé
///      des œuvres dans le cadre d'une expertise), TRANSFER_AGENT (backend
///      custodien autorisé à orchestrer les transferts).
contract PassportAccess is AccessControl {
    bytes32 public constant EXPERT_ROLE = keccak256("EXPERT_ROLE");
    bytes32 public constant TRANSFER_AGENT_ROLE = keccak256("TRANSFER_AGENT_ROLE");

    /// @notice owner → fingerprintHash → adresse autorisée à lire les détails privés.
    mapping(address => mapping(bytes32 => mapping(address => bool))) private _delegatedReaders;

    event ReaderGranted(address indexed owner, bytes32 indexed fingerprintHash, address indexed reader);
    event ReaderRevoked(address indexed owner, bytes32 indexed fingerprintHash, address indexed reader);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Un owner délègue un droit de lecture privée (ex : expert pour expertise).
    function grantReader(bytes32 fingerprintHash, address reader) external {
        _delegatedReaders[msg.sender][fingerprintHash][reader] = true;
        emit ReaderGranted(msg.sender, fingerprintHash, reader);
    }

    /// @notice Révoque un droit de lecture privée préalablement accordé.
    function revokeReader(bytes32 fingerprintHash, address reader) external {
        _delegatedReaders[msg.sender][fingerprintHash][reader] = false;
        emit ReaderRevoked(msg.sender, fingerprintHash, reader);
    }

    /// @notice Un utilisateur (`caller`) peut-il lire les détails privés du passeport ?
    /// @dev Visible si : owner soi-même, EXPERT_ROLE, ADMIN, ou délégation explicite.
    function canRead(bytes32 fingerprintHash, address owner_, address caller) external view returns (bool) {
        if (caller == owner_) return true;
        if (hasRole(DEFAULT_ADMIN_ROLE, caller)) return true;
        if (hasRole(EXPERT_ROLE, caller)) return true;
        if (_delegatedReaders[owner_][fingerprintHash][caller]) return true;
        return false;
    }
}
