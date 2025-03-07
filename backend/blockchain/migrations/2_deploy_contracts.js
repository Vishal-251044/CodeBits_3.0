const HealthRiskStorage = artifacts.require("HealthRiskStorage");

module.exports = function (deployer) {
    deployer.deploy(HealthRiskStorage);  
};
