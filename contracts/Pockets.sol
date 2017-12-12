pragma solidity ^0.4.17;
import "./Registry.sol";
import "./Service.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Pockets is Ownable {

    struct Pocket {
        uint256 balance;
        bool active;
        bool subscription;
        uint paymentAmount;
        uint paymentDeadline; // block timestamp that must be exceeded 
        uint paymentFreq; // number in seconds 
    }

    address[] public listing;
    mapping (address => Pocket) public pockets;
    uint public openBalances;
    Registry public trustedRegistry;
    
    modifier onlyActive(address providerAddress){
        require(pockets[providerAddress].active);
        _;
    }
    
    modifier onlyOwnerOrProvider(address providerAddress){
        require (msg.sender == providerAddress || msg.sender == owner); 
        _;
    }

    modifier onlyProvider(address providerAddress){
        require (msg.sender == providerAddress);
        _;
    }

    modifier onlyUnregistered(address providerAddress){
        require(!pockets[providerAddress].active);
        _;
    }
    event LogRegisterService(
       address sender, 
       uint256 paymentAmount, 
       uint256 paymentFreq, 
       uint256 initialDeposit,
       bool subscription
    );
    event LogOwner( address sender);
    event LogRegisterAddress(
       address sender, 
       uint256 paymentAmount, 
       uint256 paymentFreq, 
       uint256 paymentDeadline,
       uint256 initialDeposit,
       bool subscription
    );
    event LogRequestFunds(address sender,
                          uint256 limit,
                          uint256 newBalance);
    event LogWithdraw(address sender, uint256 paymentAmount,
                           uint256 newBalance );
    event LogDeposit( address pocket,
                       uint256 amount, 
                       uint256 newBalance);
    event LogWithdrawFromContract(uint256 amount, uint256 newBalance);
    event LogRefund(address pocket, uint256 amount,uint256 oldBalance, uint256 newBalance);
    event LogDepositToContract(address sender, uint256 amount);
    event LogCancel(address service, uint256 amount);

    function Pockets(address pocketOwner, address registry) {
        trustedRegistry = Registry(registry);
        owner = pocketOwner;
    }    

    function () payable {
        LogDepositToContract(msg.sender, msg.value);
    } 

    function registerService(
        address serviceContract, 
        bytes plan
    ) 
        public 
        onlyOwner
    {
        uint256 paymentAmount; 
        uint256 paymentFreq; 
        uint256 initialDeposit;
        bool subscription;
        bool active;
        (
            paymentAmount,
            paymentFreq, 
            initialDeposit, 
            subscription, 
            active
        ) = trustedRegistry.getPlan(serviceContract,plan);

        registerAddress(
            serviceContract,
            paymentAmount,
            paymentFreq,
            initialDeposit,
            subscription
        );
     

        Service service = Service(serviceContract);
        service.register(plan);
        LogRegisterService(
            serviceContract, 
            paymentAmount, 
            paymentFreq, 
            initialDeposit,
            subscription
        );
    }

    function getNextBlockDeadline(uint256 paymentFreq)
        private 
        returns(uint256)
    {
        return block.number + paymentFreq / trustedRegistry.getAvgBlockTime();
    }

    function registerAddress(
        address providerAddress,
        uint256 paymentAmount,
        uint256 paymentFreq,
        uint256 initialDeposit,
        bool subscription
    ) 
        public
        onlyOwner
        onlyUnregistered(providerAddress)
    {
       // TODO safe math 
        require(paymentFreq >= trustedRegistry.getAvgBlockTime());
        listing.push(providerAddress);
        var pocket = pockets[providerAddress];
        pocket.paymentFreq = paymentFreq;
        pocket.paymentAmount = paymentAmount;
        pocket.active = true;
        if ( initialDeposit > 0) {
            require(this.balance - openBalances >= initialDeposit);
            pocket.balance += initialDeposit;
            openBalances += pocket.balance;
            pocket.paymentDeadline = getNextBlockDeadline(paymentFreq);
        }
        pocket.subscription = subscription;
        
        LogRegisterAddress(
            providerAddress, 
            paymentAmount, 
            paymentFreq, 
            pocket.paymentDeadline,
            initialDeposit,
            subscription
        );
    }

    function getPocket(address providerAddress) 
        public 
        constant
        onlyOwnerOrProvider(providerAddress) 
        returns (uint256 , bool, bool, uint256, uint256, uint256)
    {
        var pocket = pockets[providerAddress];
        return (
           pocket.balance, 
           pocket.active, 
           pocket.subscription,
           pocket.paymentAmount,
           pocket.paymentDeadline,
           pocket.paymentFreq
        );
    }

    function getPocketBalance(address providerAddress) constant returns(uint) {
        return pockets[providerAddress].balance;
    } 

    function getAvailableBalance() constant returns (uint) {
        return this.balance - openBalances;
    }
    
    function hold() 
        public
        onlyActive(msg.sender)
    {
        var pocket = pockets[msg.sender];
        // Verify the contract can allocate ether 
        require(this.balance - openBalances >= pocket.paymentAmount);
        require(pocket.subscription && block.number >= pocket.paymentDeadline);

        openBalances += pocket.paymentAmount;
        pocket.balance += pocket.paymentAmount;
        pocket.paymentDeadline = getNextBlockDeadline(pocket.paymentFreq);

        LogRequestFunds(msg.sender, pocket.paymentAmount, pocket.balance);
    } 
    
    function withdraw(uint amount) payable
        public
        onlyActive(msg.sender)
    {
       
        require(pockets[msg.sender].balance >= amount);
        var pocket = pockets[msg.sender];
       
        pocket.balance = pocket.balance - amount;
        openBalances -= amount;
        msg.sender.transfer(amount);
        LogWithdraw(msg.sender, amount, pocket.balance);
       
    }
    
    function deposit(uint amount, address a)
        onlyOwner
    {
        var pocket = pockets[a];
        
        require(pocket.active == true);
        require(this.balance - openBalances - amount >= 0);
        
        pocket.balance += amount;
        openBalances += pocket.balance;
        LogDeposit(a, amount, pocket.balance);
    }

    function withdrawFromContract(uint amount) payable
        onlyOwner
    {
        require(this.balance - openBalances - amount >= 0);
        msg.sender.transfer(amount);
        LogWithdrawFromContract(amount, this.balance);
    }

    function refund(uint amount) 
        public
        onlyActive(msg.sender)
    {
        var pocket = pockets[msg.sender];
        require(pocket.balance >= amount);
        uint256 initialBalance = this.balance - openBalances;
        pocket.balance -= amount;
        openBalances -= amount;
        LogRefund(
            msg.sender, 
            amount, 
            initialBalance, 
            this.balance - openBalances
        );
    }

    function kill() 
        onlyOwner
    {
        for (uint idx = 0; idx < listing.length; idx++) {
            cancel(listing[idx]);
        }
        selfdestruct(owner);
    }

    function cancel(address providerAddress) 
        onlyOwner
        onlyActive(providerAddress)
    {
        var pocket = pockets[providerAddress];
        if (pocket.subscription && block.number > pocket.paymentDeadline) {
            openBalances += pocket.paymentAmount;
            pocket.balance += pocket.paymentAmount;
       }
        openBalances -= pocket.balance;
        providerAddress.transfer(pocket.balance);
        LogCancel(providerAddress, pocket.balance);
    }

} 