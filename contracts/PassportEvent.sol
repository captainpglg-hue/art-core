// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PassportEvent
/// @notice Journal append-only des 11 événements de la vie d'un objet d'art.
/// @dev Aucun delete possible. Lié à un passport via fingerprintHash.
contract PassportEvent is Ownable {
    /// @notice Catalogue des types d'événements supportés.
    enum EventType {
        Creation,        // 0  — création par l'artiste
        Certification,   // 1  — certification Pass-Core
        Listing,         // 2  — mise en vente Art-Core
        Sale,            // 3  — vente conclue
        Transfer,        // 4  — changement de propriété hors vente
        Restoration,     // 5  — restauration documentée
        Loan,            // 6  — prêt à un musée / collection
        Exhibition,      // 7  — exposition
        Damage,          // 8  — dégât signalé
        Recertification, // 9  — recertification après restauration
        ArchiveOrLost    // 10 — archivage ou disparition signalée
    }

    struct ArtEvent {
        EventType eventType;
        uint64    timestamp;
        address   actor;          // qui a déclaré l'événement
        bytes32   metadataHash;   // détails off-chain (photos, rapport, etc.)
    }

    /// @notice fingerprintHash → list of events (append-only).
    mapping(bytes32 => ArtEvent[]) private _events;

    event EventRecorded(
        bytes32 indexed fingerprintHash,
        uint8 indexed eventType,
        address indexed actor,
        uint256 index,
        uint64 timestamp
    );

    error InvalidEventType();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Enregistre un nouvel événement. onlyOwner = backend custodien.
    function record(bytes32 fingerprintHash, EventType eventType, address actor, bytes32 metadataHash) external onlyOwner {
        ArtEvent memory e = ArtEvent({
            eventType: eventType,
            timestamp: uint64(block.timestamp),
            actor: actor,
            metadataHash: metadataHash
        });
        _events[fingerprintHash].push(e);
        emit EventRecorded(fingerprintHash, uint8(eventType), actor, _events[fingerprintHash].length - 1, e.timestamp);
    }

    /// @notice Nombre total d'événements pour un passeport.
    function count(bytes32 fingerprintHash) external view returns (uint256) {
        return _events[fingerprintHash].length;
    }

    /// @notice Lit un événement précis.
    function getEvent(bytes32 fingerprintHash, uint256 index) external view returns (ArtEvent memory) {
        return _events[fingerprintHash][index];
    }

    /// @notice Renvoie tous les événements (attention : cher en gas read si très long historique).
    function getAll(bytes32 fingerprintHash) external view returns (ArtEvent[] memory) {
        return _events[fingerprintHash];
    }
}
