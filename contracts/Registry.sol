pragma solidity ^0.4.17;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract Registry is Ownable {

    modifier onlyServiceOwner(address serviceContract) {
        require(serviceRegistry[serviceContract].owner == msg.sender);
        _;
    }

    modifier onlyServiceNotActive(address serviceContract, bytes plan) {
        require(servicePlanRegistry[serviceContract].planRegistry[plan].active == false);
        _;
    }

    modifier onlyActivePlan(address serviceContract, bytes plan) {
        require(servicePlanRegistry[serviceContract].planRegistry[plan].active == false);
        _;
    }

    mapping(address => ServiceEntry) private serviceRegistry;
    mapping(address => ServicePlanEntry) private servicePlanRegistry;
    mapping(address => PocketEntry) private pocketRegistry;
    // Avg Blocktime in seconds
    uint256 private avgBlockTime;

    struct ServiceEntry {
        uint version;
        address owner;
    }

    struct Plan {
        uint256 paymentAmount;
        uint256 paymentFreq;
        uint256 initialDeposit;
        bool subscription;
        bool active; 
    }

    struct ServicePlanEntry {
        uint version;
        address owner;
        mapping(bytes=> Plan) planRegistry;
    }

    struct PocketEntry {
        uint version;
        address owner;
    }

    function Registry(address registerOwner, uint256 blockTime) {
        owner = registerOwner;
        avgBlockTime = blockTime;
    }

    //TODO something wrong the decleration here
    function getPlan(address service, bytes plan) 
    public
    constant
    returns (uint256, uint256, uint256, bool, bool)
    {
        Plan storage p = servicePlanRegistry[service].planRegistry[plan];
        return (p.paymentAmount, p.paymentFreq, p.initialDeposit, p.subscription, p.active);
    }
    
    function getAvgBlockTime()
    public 
    constant 
    returns (uint256)
    {
        return avgBlockTime;
    }

    function setAvgBlockTime(uint256 ms)
    public
    onlyOwner
    {
        avgBlockTime = ms;
    }

    function registerPlan(
        address service, 
        uint256 paymentAmount, 
        uint256 paymentFreq, 
        uint256 initialDeposit, 
        bool subscription, 
        bytes name
    )
        public 
        onlyServiceOwner(service)
        onlyServiceNotActive(service, name)
    {
        require(paymentFreq > avgBlockTime);
        Plan storage planEntry = servicePlanRegistry[service].planRegistry[name];
        planEntry.paymentAmount = paymentAmount;
        planEntry.paymentFreq = paymentFreq;
        planEntry.initialDeposit = initialDeposit;
        planEntry.subscription = subscription;
        planEntry.active = true;
    }

    function getService(address service) 
        constant
        returns (uint, address)
    {
        return (serviceRegistry[service].version, serviceRegistry[service].owner);
    }

    function getPocket(address pocket) 
        constant
        returns (uint, address)
    { 
        return (pocketRegistry[pocket].version, pocketRegistry[pocket].owner);
    }

    function getPocketOwner(address pocketContract)
        public
        constant
        returns (address)
    {
        return pocketRegistry[pocketContract].owner;
    }

    function changePocketOwnership(address newOwner)
        public
    {
        pocketRegistry[msg.sender].owner = newOwner;
    }    

    function changeServiceOwnership(address newOwner)
        public
    {
        serviceRegistry[msg.sender].owner = newOwner;
    } 

    function registerService(address service, address owner, uint version)
        public 
        onlyOwner
    {
        serviceRegistry[service].version = version;
        serviceRegistry[service].owner = owner;
    }

    function registerPocket(address pocket, address owner, uint version)
        public 
        onlyOwner
    {
        pocketRegistry[pocket].version = version;
        pocketRegistry[pocket].owner = owner;
    }

    function verifyServiceContract(address serviceAddress) returns (bool) {
        return serviceRegistry[serviceAddress].owner != 0;
    }

    function verifyPocketContract(address pocketAddress) returns (bool) {
        return pocketRegistry[pocketAddress].owner != 0;
    }
    
}