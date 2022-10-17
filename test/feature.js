const { expect } = require('chai');

const provider = ethers.provider;
let feature, arbitrator;
let deployer,
  sender0,
  receiver0,
  sender1,
  receiver1,
  sender2,
  receiver2,
  sender3,
  receiver3,
  sender4,
  receiver4,
  challenger0,
  sender5,
  receiver5,
  challenger1,
  sender6,
  receiver6,
  challenger2,
  sender7,
  receiver7;
let contractAsSignerDeployer, contractAsSignerSender0;

beforeEach(async function () {
  // Get the ContractFactory and Signers here.
  // TODO: deploy an Arbitrator
  const Feature = await ethers.getContractFactory('Feature');
  const CentralizedArbitrator = await ethers.getContractFactory(
    'CentralizedAppealableArbitrator',
  );

  [
    deployer,
    sender0,
    receiver0,
    sender1,
    receiver1,
    sender2,
    receiver2,
    sender3,
    receiver3,
    sender4,
    receiver4,
    challenger0,
    sender5,
    receiver5,
    challenger1,
    sender6,
    receiver6,
    challenger2,
    sender7,
    receiver7,
  ] = await ethers.getSigners();

  feature = await Feature.deploy();
  arbitrator = await CentralizedArbitrator.deploy('20000000000000000', '42'); // 0.02 ether, 42s

  await feature.deployed();
  await arbitrator.deployed();

  contractAsSignerDeployer = feature.connect(deployer);
  contractAsSignerSender0 = feature.connect(sender0);
  contractAsSignerReceiver0 = feature.connect(receiver0);
  contractAsSignerSender1 = feature.connect(sender1);
  contractAsSignerReceiver1 = feature.connect(receiver1);
  contractAsSignerSender2 = feature.connect(sender2);
  contractAsSignerReceiver2 = feature.connect(receiver2);
  contractAsSignerSender3 = feature.connect(sender3);
  contractAsSignerReceiver3 = feature.connect(receiver3);
  contractAsSignerSender4 = feature.connect(sender4);
  contractAsSignerReceiver4 = feature.connect(receiver4);
  contractAsSignerChallenger0 = feature.connect(challenger0);
  contractAsSignerSender5 = feature.connect(sender5);
  contractAsSignerReceiver5 = feature.connect(receiver5);
  contractAsSignerChallenger1 = feature.connect(challenger1);
  contractAsSignerSender6 = feature.connect(sender6);
  contractAsSignerReceiver6 = feature.connect(receiver6);
  contractAsSignerChallenger2 = feature.connect(challenger2);
  contractAsSignerSender7 = feature.connect(sender7);
  contractAsSignerReceiver7 = feature.connect(receiver7);

  contractAsSignerJuror = arbitrator.connect(deployer);

  const initializeTx = await contractAsSignerDeployer.initialize();
});

describe('Feature', function () {
  it('Should pay the receiver after a claim and a payment', async function () {
    const createTransactionTx = await contractAsSignerSender0.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10 days
      '259200', // _timeoutClaim => 3 days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
      },
    );

    expect((await feature.transactions(0)).sender).to.equal(sender0.address);
    expect((await feature.transactions(0)).delayClaim).to.equal('259200');

    const claimTx = await contractAsSignerReceiver0.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Wait until the transaction is mined
    const transactionMinedClaimTx = await claimTx.wait();

    expect((await feature.transactions(0)).runningClaimCount).to.equal(1);

    const gasFeeClaimTx = transactionMinedClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    expect((await feature.claims(0)).transactionID).to.equal(0);

    await network.provider.send('evm_increaseTime', [259200]);
    await network.provider.send('evm_mine'); // this one will have 100s more

    const payTx = await contractAsSignerDeployer.pay(
      0, // _claimID
    );

    const newBalanceReceiverExpected = new ethers.BigNumber.from(
      '10001000000000000000000',
    ).sub(gasFeeClaimTx);

    expect((await provider.getBalance(receiver0.address)).toString()).to.equal(
      newBalanceReceiverExpected.toString(),
    );
  });

  it('Should refund the money to the sender after a timeout payment without any claim', async function () {
    const createTransactionTx = await contractAsSignerSender1.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10days
      '259200', // _timeoutClaim => 3days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
        gasPrice: 150000000000,
      },
    );

    expect((await feature.transactions(0)).sender).to.equal(sender1.address);

    // Wait until the transaction is mined
    const transactionMinedClaimTx = await createTransactionTx.wait();
    const gasFeeCreateTransactionTx = transactionMinedClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    await network.provider.send('evm_increaseTime', [864000]);
    await network.provider.send('evm_mine');

    const withdrawTx = await contractAsSignerDeployer.refund(
      0, // _transactionID
    );

    const newBalanceSenderExpected = new ethers.BigNumber.from(
      '10000000000000000000000',
    ).sub(gasFeeCreateTransactionTx);

    expect((await provider.getBalance(sender1.address)).toString()).to.equal(
      newBalanceSenderExpected.toString(),
    );
  });

  it('Should revert the refund to the sender if the timeout payment is not passed', async function () {
    const createTransactionTx = await contractAsSignerSender2.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10days
      '259200', // _timeoutClaim => 3days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
        gasPrice: 150000000000,
      },
    );

    expect((await feature.transactions(0)).sender).to.equal(sender2.address);

    // Wait until the transaction is mined
    const transactionMinedClaimTx = await createTransactionTx.wait();
    const gasFeeCreateTransactionTx = transactionMinedClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    const claimTx = await contractAsSignerReceiver1.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    await network.provider.send('evm_increaseTime', [42]);
    await network.provider.send('evm_mine');

    await expect(contractAsSignerDeployer.refund(0)).to.be.revertedWith(
      'The timeout payment should be passed.',
    );
  });

  it('Should revert the refund to the sender if there is any claim', async function () {
    const createTransactionTx = await contractAsSignerSender3.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10days
      '259200', // _timeoutClaim => 3days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
        gasPrice: 150000000000,
      },
    );

    expect((await feature.transactions(0)).sender).to.equal(sender3.address);

    // Wait until the transaction is mined
    const transactionMinedClaimTx = await createTransactionTx.wait();
    const gasFeeCreateTransactionTx = transactionMinedClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    const claimTx = await contractAsSignerReceiver2.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    await network.provider.send('evm_increaseTime', [864000]);
    await network.provider.send('evm_mine');

    await expect(contractAsSignerDeployer.refund(0)).to.be.revertedWith(
      'The transaction should not to have running claims.',
    );
  });

  it('Should give the arbitration fee and the total deposit to the challenger after a successful challenge', async function () {
    const createTransactionTx = await contractAsSignerSender4.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10 days
      '259200', // _timeoutClaim => 3 days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
      },
    );

    // Claim
    const claimTx = await contractAsSignerReceiver3.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Challenge claim
    const challengeClaimTx = await contractAsSignerChallenger0.challengeClaim(
      0, // _claimID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Wait until the transaction is mined
    const transactionMinedChallengeClaimTx = await challengeClaimTx.wait();

    const gasFeeChallengeClaimTx = transactionMinedChallengeClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    // Give ruling
    await contractAsSignerJuror.giveRuling(
      0, // _disputeID
      2, // Ruling for the challenger
    );

    await network.provider.send('evm_increaseTime', [42]);
    await network.provider.send('evm_mine'); // this one will have 100s more

    // Execute ruling
    await contractAsSignerJuror.giveRuling(
      0, // _disputeID
      2, // Ruling for the challenger
    );

    const claim = await feature.claims(0);

    // Claim status switch to Resolved.
    expect(parseInt(claim.status)).to.equal(2);

    const newBalanceChallenger0Expected = new ethers.BigNumber.from(
      '10000000000000000000000',
    )
      .sub(gasFeeChallengeClaimTx)
      .add('100000000000000000');

    expect(
      (await provider.getBalance(challenger0.address)).toString(),
    ).to.equal(newBalanceChallenger0Expected.toString());
  });

  it('Should give the amount of the total deposit to the claimer after a aborted challenge', async function () {
    const createTransactionTx = await contractAsSignerSender5.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10 days
      '259200', // _timeoutClaim => 3 days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
      },
    );

    // Claim
    const claimTx = await contractAsSignerReceiver4.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Wait until the transaction is mined
    const transactionMinedClaimTx = await claimTx.wait();

    const gasFeeClaimTx = transactionMinedClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    // Challenge claim
    const challengeClaimTx = await contractAsSignerChallenger1.challengeClaim(
      0, // _claimID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    await challengeClaimTx.wait();

    // Give ruling
    const giveRulingTx = await contractAsSignerJuror.giveRuling(
      0, // _disputeID
      1, // Ruling for the receiver
    );

    await network.provider.send('evm_increaseTime', [42]);
    await network.provider.send('evm_mine'); // this one will have 100s more

    // Execute ruling
    await contractAsSignerJuror.giveRuling(
      0, // _disputeID
      1, // Ruling for the challenger
    );

    const newBalanceReceiver4Expected = new ethers.BigNumber.from(
      '10000000000000000000000',
    )
      .sub(gasFeeClaimTx)
      .sub('20000000000000000');

    expect((await provider.getBalance(receiver4.address)).toString()).to.equal(
      newBalanceReceiver4Expected.toString(),
    );
  });

  it('Should give the amount of the total deposit to the claimer after a successful appeal', async function () {
    const createTransactionTx = await contractAsSignerSender6.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10 days
      '259200', // _timeoutClaim => 3 days
      '', // _metaEvidence
      {
        value: '1000000000000000000', // 1eth in wei
      },
    );

    // Claim
    const claimTx = await contractAsSignerReceiver5.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Wait until the transaction is mined
    const transactionMinedClaimTx = await claimTx.wait();

    const gasFeeClaimTx = transactionMinedClaimTx.gasUsed
      .valueOf()
      .mul(150000000000);

    // Challenge claim
    const challengeClaimTx = await contractAsSignerChallenger2.challengeClaim(
      0, // _claimID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    await challengeClaimTx.wait();

    // Give ruling
    const giveRulingTx = await contractAsSignerJuror.giveRuling(
      0, // _disputeID
      2, // Ruling for the challenger
    );

    // Appeal
    const appealTx = await contractAsSignerReceiver5.appeal(
      0, // _claimID
      {
        value: '20000000000000000', // 0.2eth
        gasPrice: 150000000000,
      },
    );

    expect((await contractAsSignerJuror.disputes(0)).status).to.equal(1);
    expect((await contractAsSignerJuror.disputes(0)).isAppealed).to.true;

    // Wait until the transaction is mined
    const transactionMinedAppealTx = await appealTx.wait();

    const gasFeeAppealTx = transactionMinedAppealTx.gasUsed
      .valueOf()
      .mul(150000000000);

    await network.provider.send('evm_increaseTime', [42]);
    await network.provider.send('evm_mine'); // this one will have 100s more

    // Execute ruling
    await contractAsSignerJuror.giveRuling(
      0, // _disputeID
      1, // Ruling for the receiver
    );

    expect((await contractAsSignerJuror.disputes(0)).status).to.equal(2);
    expect((await contractAsSignerJuror.disputes(0)).ruling).to.equal(1);

    const newBalanceReceiver5Expected = new ethers.BigNumber.from(
      '10000000000000000000000',
    )
      .sub(gasFeeClaimTx)
      .sub(gasFeeAppealTx)
      .sub('40000000000000000');

    expect((await provider.getBalance(receiver5.address)).toString()).to.equal(
      newBalanceReceiver5Expected.toString(),
    );
  });

  // Scenario: 2 claimers, the first one get the reward.
  it('Should give the amount of the first claimer who claim in multiple successful claims', async function () {
    const createTransactionTx = await contractAsSignerSender7.createTransaction(
      arbitrator.address,
      0x00,
      '100000000000000000', // _deposit for claim : 0.1eth => 10% of amount
      '864000', // _timeoutPayment => 10 days
      '259200', // _challengePeriod => 3 days
      '', // _metaEvidence
    );

    // 1st claim
    const claimTx1 = await contractAsSignerReceiver6.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Wait until the transaction is mined
    const transactionMinedClaimTx1 = await claimTx1.wait();
    const gasFeeClaimTx1 = transactionMinedClaimTx1.gasUsed
      .valueOf()
      .mul(150000000000);

    // 2nd claim
    const claimTx2 = await contractAsSignerReceiver7.claim(
      0, // _transactionID
      {
        value: '120000000000000000', // 0.12eth
        gasPrice: 150000000000,
      },
    );

    // Wait until the transaction is mined
    const transactionMinedClaimTx2 = await claimTx2.wait();
    const gasFeeClaimTx2 = transactionMinedClaimTx2.gasUsed
      .valueOf()
      .mul(150000000000);

    // Wait until the challenge period is over
    await network.provider.send('evm_increaseTime', [259200]);
    await network.provider.send('evm_mine');

    // Pay the first claimer
    const payTx = await contractAsSignerDeployer.pay(
      0, // _claimID
    );

    const newBalanceReceiver6Expected = new ethers.BigNumber.from(
      '10000000000000000000000',
    ).sub(gasFeeClaimTx1);

    const newBalanceReceiver7Expected = new ethers.BigNumber.from(
      '10000000000000000000000',
    )
      .sub(gasFeeClaimTx2)
      .sub(ethers.BigNumber.from('120000000000000000')); // Claim's value

    // First claimer should receive the payment
    expect((await provider.getBalance(receiver6.address)).toString()).to.equal(
      newBalanceReceiver6Expected.toString(),
    );

    // Second claimer must not receive the payment
    expect((await provider.getBalance(receiver7.address)).toString()).to.equal(
      newBalanceReceiver7Expected.toString(),
    );
  });
});
