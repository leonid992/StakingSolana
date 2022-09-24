const {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  StakeProgram,
  Authorized,
  Lockup,
  sendAndConfirmTransaction,
  PublicKey,
} = require("@solana/web3.js");

const main = async () => {
  const connection = new Connection(clusterApiUrl("devnet", "processed"));
  const wallet = Keypair.generate();
  const airdropSign = await connection.requestAirdrop(
    wallet.publicKey,
    1 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSign);

  const stakeAccount = Keypair.generate();
  const minimumRent = await connection.getMinimumBalanceForRentExemption(
    StakeProgram.space
  );
  const amountUserWantsToStake = 0.5 * LAMPORTS_PER_SOL;
  const amountToStake = minimumRent + amountUserWantsToStake;

  const stakeAccTx = StakeProgram.createAccount({
    authorized: new Authorized(wallet.publicKey, wallet.publicKey),
    fromPubkey: wallet.publicKey,
    lamports: amountToStake,
    lockup: new Lockup(0, 0, wallet.publicKey),
    stakePubkey: stakeAccount.publicKey,
  });

  const stakeAccTxId = await sendAndConfirmTransaction(connection, stakeAccTx, [
    wallet,
    stakeAccount,
  ]);

  console.log(`Stake account created. Tx Id: ${stakeAccTxId}`);
  let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
  console.log(`Stake account balance: ${stakeBalance / LAMPORTS_PER_SOL} SOL`);

  let stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log(`Stake status:  ${stakeStatus.state}`);

  const validators = await connection.getVoteAccounts();
  const selectedValidator = validators.current[0];
  const selectedValidatorPubKey = new PublicKey(selectedValidator.votePubkey);
  const delegateTx = StakeProgram.delegate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: wallet.publicKey,
    votePubkey: selectedValidatorPubKey,
  });

  const delegateTxId = await sendAndConfirmTransaction(connection, delegateTx, [
    wallet,
  ]);
  console.log(
    `Stake account delegated to ${selectedValidatorPubKey}. Tx Id: ${delegateTxId}`
  );

  stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log(`Stake status:  ${stakeStatus.state}`);

  const deactivateTx = StakeProgram.deactivate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: wallet.publicKey,
  });
  const deactivateTxId = await sendAndConfirmTransaction(
    connection,
    deactivateTx,
    [wallet]
  );
  console.log(`Stake account deactivated. Tx Id: ${deactivateTxId}`);

  stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log(`Stake status:  ${stakeStatus.state}`);
};

const runMain = async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
  }
};
runMain();
