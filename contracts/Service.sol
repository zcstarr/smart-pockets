pragma solidity ^0.4.17;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Registry.sol";
import "./Pockets.sol";


contract Service is Ownable {

    struct PocketUser {
        bool active;
        bytes plan;
    }
    address[] private pocketListing;
    Registry  private trustedRegistry;
    address public trustedHub;
    mapping(address => PocketUser) public pocketUserRegistry;

    modifier onlyPocket() 
    {
        var (,pocketAddress) = trustedRegistry.getPocket(msg.sender);
        require(pocketAddress != 0);
        _;
    }

    modifier onlyActive(address pocket) {
        require(pocketUserRegistry[pocket].active != false);
        _;
    }

    modifier onlyUnregistered() {
        require(pocketUserRegistry[msg.sender].active == false);
        _;
    }

    event LogRegisterPocket(address sender, bytes plan, uint256 id);
    event LogDeposit(address sender, uint256 amount);
    event LogWithdraw(address pocketAddress, uint256 amount);
    event LogRefund(address pocketAddress, uint256 amount);
    event LogHold(address pocketAddress);

    function Service(address serviceOwner, address serviceRegistry) {
        owner = serviceOwner;
        trustedHub = msg.sender;
        trustedRegistry = Registry(serviceRegistry);
    }

    function () payable {
        LogDeposit(msg.sender, msg.value);
    } 

    function register(bytes plan)
        public 
        onlyPocket
        onlyUnregistered
    {
        uint256 idx = pocketListing.length;
        pocketUserRegistry[msg.sender].active = true;
        pocketUserRegistry[msg.sender].plan = plan;
        pocketListing.push(msg.sender);
        LogRegisterPocket(msg.sender, plan, idx);
    } 

    function requestHold(address pocketAddress) 
        onlyOwner
    {
        Pockets pocket = Pockets(pocketAddress);
        pocket.hold();
        LogHold(pocketAddress);
    }

    function withdrawFromContract()
        onlyOwner
    {
        msg.sender.transfer(this.balance);
    }
    
    function withdrawFromPocket(address pocketAddress, uint256 amount)
        public
        onlyOwner
        onlyActive(pocketAddress)
    {
        Pockets pocket = Pockets(pocketAddress);
        pocket.withdraw(amount);
        LogWithdraw(pocketAddress, amount);
    }

    function refundHold(address pocketAddress, uint256 amount) 
        public
        onlyActive(pocketAddress)
    {
        Pockets pocket = Pockets(pocketAddress);
        pocket.refund(amount);
        LogWithdraw(pocketAddress, amount);
    }

    function getPocketByIdx(uint256 idx)
        constant
        returns(address, bool, bytes) 
    {
        address addr = pocketListing[idx];
        return getPocket(addr);
    }

    function getNumberOfPockets()
        constant
        returns(uint256)
    {
        return pocketListing.length;
    }

    function getPocket(address pocket) 
        constant
        returns(address,bool, bytes)
    {
        PocketUser storage pocketUser = pocketUserRegistry[pocket];
        return (pocket, pocketUser.active, pocketUser.plan);
    }

}