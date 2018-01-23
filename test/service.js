const Pockets = artifacts.require("./Pockets.sol");
const Service = artifacts.require("./Service.sol");
const Registry = artifacts.require("./Registry.sol");
const chai = require('chai');
const {expect} = chai;
const { advanceBlock, assertJump, checkInvalidOp } = require('./utils');

//DEFINING GAS price to fixed number for test purposes
const GAS_PRICE = new web3.BigNumber(100000000000);
const AVG_BLOCK_TIME = 17000;
const TEST_PAYMENT_FREQ = 5 * AVG_BLOCK_TIME; 

contract('Service', function(accounts) {

  let registry; 
  let pocket;
  let testAddress;
  let pocketOwner;
  let serviceOwner;

  beforeEach(async () => {
    registry = await Registry.new(accounts[2],AVG_BLOCK_TIME);
    pocket = await Pockets.new(accounts[0], registry.address);
    service = await Service.new(accounts[1], registry.address);
    pocketOwner = accounts[0];
    serviceOwner = accounts[1];
    // Initialize registry with a plan a service and a pocket
    await registry.registerService(service.address, serviceOwner, 1, {from: accounts[2]});
    await registry.registerPocket(pocket.address, pocketOwner, 1, {from: accounts[2]});
    await registry.registerPlan(service.address, web3.toWei(1,'ether'), TEST_PAYMENT_FREQ, 0, true, 'test', {from: accounts[1]});
    // Start pocket contract off with some eth
    await web3.eth.sendTransaction({ to: pocket.address, from: accounts[3], value: web3.toWei('2', 'ether') })
    // start the contract off with 1000 wei balance
  });

  it("should allow pocket to register", async () => {

    await checkInvalidOp(() => (pocket.registerService(service.address, 'non-existantplan', { from: accounts[0] })));

    const {logs} = await pocket.registerService(service.address, 'test', {from: accounts[0]});
    const result = await service.getPocketByIdx.call(0)
    expect(result[0]).to.eq(pocket.address);
    expect(result[1]).to.eq(true);
    expect(web3.toAscii(result[2]).toString()).to.eq('test');
  });

  it("should request a payment from pocket", async () => {
    await pocket.registerService(service.address, 'test', { from: pocketOwner });
    await service.requestHold(pocket.address, { from: serviceOwner });
    const balance = await pocket.getPocketBalance.call(service.address);
    expect(balance.toString()).to.eq(web3.toWei(1, 'ether').toString());
  });

  it("should withdraw a payment from pocket", async () => {

      await pocket.registerService(service.address, 'test', { from: pocketOwner });
      await service.requestHold(pocket.address, { from: serviceOwner });
      const beforePayment = await web3.eth.getBalance(service.address);

      // Should prevent a non owner from withdrawing
      await checkInvalidOp(() => (service.withdraw(pocket.address, web3.toWei(0.5, 'ether'), { from: accounts[5] })));

      const { receipt } = await service.withdraw(pocket.address, web3.toWei(0.5, 'ether'), { from: serviceOwner });
      const serviceBalance = await web3.eth.getBalance(service.address);

      const gasCost = GAS_PRICE * receipt.gasUsed;
      expect(serviceBalance.toString()).to.eq(beforePayment.add(web3.toWei(0.5,'ether')).toString())

      const balanceAfterPayment = await pocket.getPocketBalance.call(service.address);
      expect(balanceAfterPayment.toString()).to.eq(web3.toWei(0.5,'ether').toString());
  });

  it("should withdraw a payment from service contract", async () => {

      await web3.eth.sendTransaction({ to: service.address, from: accounts[3], value: web3.toWei('2', 'ether') })
      const initialBalance = await web3.eth.getBalance(serviceOwner);

      //should prevent non owner from withdrawing from the contract
      await checkInvalidOp(() => (service.withdrawFromContract({from: accounts[5]}))) 

      const { receipt } = await service.withdrawFromContract({ from: serviceOwner });
      const currentBalance = await web3.eth.getBalance(serviceOwner);

      const gasCost = GAS_PRICE * receipt.gasUsed;
      expect(initialBalance.add(web3.toWei(2,'ether')).toString()).to.eq(currentBalance.add(gasCost).toString());

  });

});
