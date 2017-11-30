const PocketsHub = artifacts.require("./PocketsHub.sol");
const Pockets = artifacts.require('./Pockets.sol');
const Registry = artifacts.require('./Registry.sol');
const Service = artifacts.require('./Service.sol');
const chai = require('chai');
const {expect} = chai;
const { advanceBlock, assertJump, checkInvalidOp } = require('./utils');

contract('Integration Test', function (accounts) {

  //DEFINING GAS price to fixed number for test purposes
  const GAS_PRICE = new web3.BigNumber(100000000000);
  const AVG_BLOCK_TIME = 17000;
  const TEST_PAYMENT_FREQ = 5 * AVG_BLOCK_TIME;
  const TEST_PLAN = 'test';

  let pocketHubOwner;
  let pocketOwner;
  let serviceOwner;
  let walletAddress;
  let contributor;
  let registry;
  let pocketsHub;

  beforeEach(async () => {
    pocketHubOwner = accounts[0];
    pocketOwner = accounts[1];
    serviceOwner = accounts[2];
    walletAddress = accounts[3];
    contributor = accounts[4];
    pocketsHub = await PocketsHub.new(17000, { from: pocketHubOwner });
    registry = Registry.at(await pocketsHub.trustedRegistry.call());
  });


  const getGas = (txReceipt) => {
    return txReceipt.receipt.gasUsed;
  }

  const eventWatcher = (event, handler) => {
    return new Promise((resolve) => {
      event.watch((err, result) => {
        if (err)
          throw new Error(err);
        event.stopWatching();
        resolve(handler(result));
      });
    });
  };

  const setupPocketAndService = async (pocketOwner, serviceOwner, paymentAmount) => {
    //register event watcher
    const newService = eventWatcher(pocketsHub.LogNewService(), (r) => (r.args.service));
    const newPocket = eventWatcher(pocketsHub.LogNewPocket(), (r) => {
    console.log(r);
    return r.args.pocket;
    });

    //Generate a Pocket and a Service Contract
    await pocketsHub.newService({ from: serviceOwner });
    await pocketsHub.newPocket({ from: pocketOwner });

    const serviceAddress = await newService;
    const pocketAddress = await newPocket;

    const pocket = await Pockets.at(pocketAddress);
    const service = await Service.at(serviceAddress);

    return { pocket, service };
  }

  const depositEth = async (address, amount) => {
   return await web3.eth.sendTransaction({
      to: address,
      from: contributor,
      value: web3.toWei(amount, 'ether')
    });
  }

 const registerServiceProvider = async ({ pocket, address, amount, initialDeposit, plan }) => {
    return await pocket.registerAddress(address,
      web3.toWei(amount, 'ether'),
      TEST_PAYMENT_FREQ,
      initialDeposit,
      true,
      { from: pocketOwner }
    );
  }


  const setupTestServiceRegistration = async (pocket, serviceAddress) =>{
    const planTx = await registry.registerPlan(serviceAddress, web3.toWei('1', 'ether'), TEST_PAYMENT_FREQ, 0, true, TEST_PLAN, { from: serviceOwner });
    const registerTx = await pocket.registerService(serviceAddress, TEST_PLAN, { from: pocketOwner });
    return {planTx, registerTx};
  }

  const setupTestWalletRegistration = async (pocket, walletAddress) =>{
      return await pocket.registerAddress(walletAddress,
        web3.toWei(1.0, 'ether'),
        TEST_PAYMENT_FREQ,
        0,
        true,
        { from: pocketOwner }
      );

  }

  const requestAndWithdrawFundsUsingService = async(pocket, service, amount)=>{
    let gasSpent = 0;

    let tx = await service.requestHold(pocket.address, { from: serviceOwner });
    gasSpent += getGas(tx);

    tx = await service.withdrawFromPocket(pocket.address, amount, { from: serviceOwner }); 
    gasSpent += getGas(tx);
    
    return gasSpent;
  }

  const requestAndWithdrawFunds = async (pocket, walletAddress, amount) => {
    let gasSpent = 0;

    let tx = await pocket.hold({ from: walletAddress })
    gasSpent += getGas(tx);

    tx = await pocket.withdraw(amount, { from: walletAddress })
    gasSpent += getGas(tx);

    return gasSpent
  }

  const checkBalance = (actualBalance, gasSpent, expectedBalance) => {
    expect(actualBalance.add(gasSpent * GAS_PRICE).toString()).to.eq(expectedBalance.toString())
  }

  it("should subscribe to a wallet, request 1 eth , withdraw 0.5 eth and refund 0.5 eth request twice", async () => {

    // Make sure the subscription aspect works

    const { pocket, service } = await setupPocketAndService(pocketOwner, serviceOwner);
    await depositEth(pocket.address, 2);
    let gasSpent = 0;

    await setupTestWalletRegistration(pocket, walletAddress);
    for (let i = 0; i < 2; i++) {
      const initialBalance = web3.eth.getBalance(walletAddress);
      let gasSpent = 0;
      gasSpent += await requestAndWithdrawFunds(pocket, walletAddress, web3.toWei(0.5, 'ether'));

      let balance = await web3.eth.getBalance(walletAddress);
      checkBalance(balance, gasSpent, initialBalance.add(web3.toWei(0.5, 'ether')))

      const beforeBalance = await pocket.getAvailableBalance.call();
      await pocket.refund(web3.toWei(0.5, 'ether'), { from: walletAddress });
      const afterBalance = await pocket.getAvailableBalance.call();
      checkBalance(afterBalance, 0, beforeBalance.add(web3.toWei(0.5, 'ether')))

      for (let i = 0; i < 5; i++)
        await advanceBlock();
    }
    const beforeWalletBalance = await web3.eth.getBalance(walletAddress);
    const beforePocketBalance = await pocket.getAvailableBalance.call();

    let tx = await pocket.cancel(walletAddress, {from: pocketOwner});

    const afterWalletBalance = await web3.eth.getBalance(walletAddress);
    const afterPocketBalance = await pocket.getAvailableBalance.call();

    checkBalance(beforeWalletBalance.add(web3.toWei(1.0, 'ether')), 0, afterWalletBalance);
    checkBalance(beforePocketBalance.sub(web3.toWei(1.0, 'ether')), 0, afterPocketBalance);

  });

  it("should subscribe to a service provider, request 1 eth , withdraw 0.5 eth and refund 0.5 eth request twice", async () => {

    const { pocket, service } = await setupPocketAndService(pocketOwner, serviceOwner);
    await depositEth(pocket.address, 2);
    await depositEth(pocket.address, 2);
    let gasSpent = 0;

    await setupTestServiceRegistration(pocket, service.address);
    for (let i = 0; i < 2; i++) {
      const initialBalance = web3.eth.getBalance(service.address);
      let gasSpent = 0;
      gasSpent += await requestAndWithdrawFundsUsingService(pocket, service, web3.toWei(0.5, 'ether'));

      let balance = await web3.eth.getBalance(service.address);
      checkBalance(balance, 0, initialBalance.add(web3.toWei(0.5, 'ether')));

      const beforeBalance = await pocket.getAvailableBalance.call();
      await service.refundHold(pocket.address, web3.toWei(0.5, 'ether'), { from: serviceOwner });

      const afterBalance = await pocket.getAvailableBalance.call();
      checkBalance(afterBalance, 0, beforeBalance.add(web3.toWei(0.5, 'ether')));

      for (let i = 0; i < 5; i++)
        await advanceBlock();
    }
    const beforeServiceBalance = await web3.eth.getBalance(service.address);
    const beforePocketBalance = await pocket.getAvailableBalance.call();

    let tx = await pocket.cancel(service.address, { from: pocketOwner });

    const afterServiceBalance = await web3.eth.getBalance(service.address);
    const afterPocketBalance = await pocket.getAvailableBalance.call();

    checkBalance(beforeServiceBalance.add(web3.toWei(1.0, 'ether')), 0, afterServiceBalance);
    checkBalance(beforePocketBalance.sub(web3.toWei(1.0, 'ether')), 0, afterPocketBalance);

  });

});