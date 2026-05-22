// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PassportRegistry.sol";
import "./PassportEvent.sol";

/// @title PassportVerify
/// @notice Fonctions read-only pour vérifier l'authenticité et lire l'historique
///         d'un passeport. Sans état propre — agrège Registry + Event.
contract PassportVerify {
    PassportRegistry public immutable registry;
    PassportEvent    public immutable eventLog;

    constructor(address registryAddress, address eventAddress) {
        registry = PassportRegistry(registryAddress);
        eventLog = PassportEvent(eventAddress);
    }

    /// @notice Vérifie qu'un passeport existe et n'est pas révoqué.
    function verify(bytes32 fingerprintHash) external view returns (bool isValid, address currentOwner, uint8 status) {
        if (!registry.exists(fingerprintHash)) {
            return (false, address(0), 0);
        }
        PassportRegistry.Passport memory p = registry.getPassport(fingerprintHash);
        return (p.status == 1, p.owner, p.status);
    }

    /// @notice Renvoie l'historique complet d'événements.
    function getHistory(bytes32 fingerprintHash) external view returns (PassportEvent.ArtEvent[] memory) {
        return eventLog.getAll(fingerprintHash);
    }

    /// @notice Renvoie un "résumé" léger : owner + nb événements + statut.
    function summary(bytes32 fingerprintHash)
        external
        view
        returns (address owner_, uint8 status, uint64 createdAt, uint256 eventCount)
    {
        PassportRegistry.Passport memory p = registry.getPassport(fingerprintHash);
        return (p.owner, p.status, p.createdAt, eventLog.count(fingerprintHash));
    }
}
