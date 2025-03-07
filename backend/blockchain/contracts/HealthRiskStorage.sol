// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthRiskStorage {
    struct HealthData {
        string riskLevel;
        string suggestion;
        string timestamp;
        string email;
    }

    address public admin;  
    mapping(string => HealthData[]) private userHealthRecords; 

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can store data");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function storeHealthData(
        string memory _email,
        string memory _riskLevel,
        string memory _suggestion,
        string memory _timestamp
    ) public onlyAdmin {  
        userHealthRecords[_email].push(HealthData(_riskLevel, _suggestion, _timestamp, _email));
    }

    function getHealthData(string memory _email) public view returns (HealthData[] memory) {
        return userHealthRecords[_email];
    }
}
