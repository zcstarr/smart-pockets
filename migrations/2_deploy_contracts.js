
const PocketsHub = artifacts.require("./PocketsHub.sol");
module.exports = function(deployer) {
  deployer.deploy(PocketsHub, 17000);
};
