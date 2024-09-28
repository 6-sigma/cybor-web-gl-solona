import { createWeb3Modal, defaultSolanaConfig, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@web3modal/solana/chains'
import { useEffect, useState, useRef, useCallback } from "react";
import {
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  Connection,
  TransactionInstruction
} from '@solana/web3.js'

import base58 from 'bs58';

import { Unity, useUnityContext } from 'react-unity-webgl';

const Program_Id = "9sutTcUUjWVMabvUnBFu5WcBLNkuHHv9tLWhUUeCM6Cy";

const events: string[] = [];

// 0. Setup chains
const chains = [solana, solanaTestnet, solanaDevnet]

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");


// 2. Create solanaConfig
const metadata = {
  name: 'Cybor Solana Demo',
  description: `Set Up a Solana-Compatible Wallet: You'll need a wallet like Phantom or Sollet that supports Solana-based tokens and NFTs. Ensure you have some SOL (Solana's native token) to cover transaction fees.

Connect to the Game Platform: If the Cybor game is hosted on a decentralized platform, you will likely connect your wallet to the game's website or dApp (decentralized application) through your browser.

Interact with the Game: Once connected, you can explore the features of the game. Given Cybor's unique gameplay of collecting "memory fragments" through battles and using them to upgrade Imprint NFTs, you'd interact with various gameplay elements directly on the Solana network.

On-Chain Gameplay: Solana's high throughput and low latency would allow you to perform actions like battling, minting NFTs, upgrading assets, and transferring game tokens efficiently.

Check with the Cybor game's official site or community for specific links to the platform running on Solana.`,
  url: 'https://www.6sig.io', // origin must match your domain & subdomain
  icons: ['https://cybordemo.game.6sig.io/mo_hom.png'],
}

const solanaConfig = defaultSolanaConfig({
  metadata,
  chains,
  projectId,
  auth: {
    email: false,
    socials: ['google', 'x', 'discord', 'farcaster', 'github', 'apple', 'facebook'],
    walletFeatures: true, //set to true by default
    showWallets: true //set to true by default
  }
})

// 3. Create modal
createWeb3Modal({
  metadata,
  solanaConfig,
  chains,
  projectId,
  enableOnramp: true //set to true by default
})

interface UnityReactChannelRequest {
  act: string;
  req: string;
}

const App = () => {

  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState("");
  const txtConsoleRef = useRef(null);

  const { address, chainId } = useWeb3ModalAccount()
  const { walletProvider, connection } = useWeb3ModalProvider()


  const { unityProvider, sendMessage, isLoaded } = useUnityContext({
    loaderUrl: 'Build-WebGL/Build/Build-WebGL.loader.js',
    dataUrl: 'Build-WebGL/Build/Build-WebGL.data',
    frameworkUrl: 'Build-WebGL/Build/Build-WebGL.framework.js',
    codeUrl: 'Build-WebGL/Build/Build-WebGL.wasm',
  });

  useEffect(() => {
    if (walletProvider) {
      handleGetBalance();
      setIsConnected(true)
    } else {
      setIsConnected(false)
    }
  }, [walletProvider]);

  var CallUnityFunction = useCallback(
    (act: string, resp: object) => {
      console.log('isLoaded ::::: ', isLoaded);
      if (isLoaded) {
        var respStr = JSON.stringify(resp);
        // TODO Encrypt
        var msg = JSON.stringify({ Act: act, Resp: respStr });
        console.debug('CallUnity MSG ::::: ', msg);
        sendMessage('WebGLChannel', 'WaitReactCallMe', msg);
      }
    },
    [isLoaded],
  );

  useEffect(() => {
    // notify unity return to login scene if changed
    if (isLoaded) {
      console.log('Wallet-Info ::::: ', address, balance, chainId);
      CallUnityFunction('wallet_info', {
        address: address,
        balance: parseFloat(balance),
      });
    }
    return () => { };
  }, [isConnected, balance, address, walletProvider, connection, chainId, isLoaded]);


  const handleFaucet = async () => {
    // redirect to
    window.open('https://solfaucet.com/', '_blank');
  }

  const printConsole = (msg: string) => {
    const txtConsole = txtConsoleRef.current as HTMLTextAreaElement | null;
    txtConsole!.value = msg;
    console.log(msg);
  }

  const handleGetBalance = async () => {
    if (!walletProvider || !address || !connection) {
      printConsole('walletProvider or address is undefined');
      return;
    }
    const balance = await connection.getBalance(walletProvider.publicKey);
    //convert balance to SOL
    const sol = balance / 1000000000;
    // setBalance(sol.toString() + " SOL");
    setBalance(sol.toString());
    console.log('Balance: ', sol.toString() + " SOL");
  }

  const handleSign = async () => {
    if (!walletProvider || !address) {
      printConsole('walletProvider or address is undefined');
      return;
    }

    const encodedMessage = new TextEncoder().encode('Cybor Solana')
    const signature = await walletProvider.signMessage(encodedMessage)
    const base58SignatureValue = base58.encode(signature)

    printConsole(`Signature: ${base58SignatureValue}`);
  }

  const handleSendTransaction = async () => {
    if (!connection) {
      printConsole('connection not set');
      return;
    }
    if (!walletProvider || !address || !connection) {
      printConsole('walletProvider or address is undefined');
      return;
    }

    const recipientAddress = new PublicKey("DG1Bq6muEMqaW6MHzWZFfQ8MmHiwvEuQcjVefVmPoV3j")

    // Create a new transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletProvider.publicKey,
        toPubkey: recipientAddress,
        lamports: 10000000,  //0.01 SOL
      })
    )
    transaction.feePayer = walletProvider.publicKey;

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const tx = await walletProvider.sendTransaction(transaction, connection as Connection)
    // Update Balance after 8s
    setTimeout(handleGetBalance, 8000);

    printConsole(tx);
  }

  const handleSendTransactionv0 = async () => {
    if (!connection) {
      printConsole('connection not set');
      return;
    }
    if (!walletProvider || !address || !connection) {
      printConsole('walletProvider or address is undefined');
      return;
    }

    const recipientAddress = new PublicKey("DG1Bq6muEMqaW6MHzWZFfQ8MmHiwvEuQcjVefVmPoV3j")

    // Create a new transaction
    const instructions = [
      SystemProgram.transfer({
        fromPubkey: walletProvider.publicKey,
        toPubkey: recipientAddress,
        lamports: 10000000 //0.01 SOL
      })
    ]
    const { blockhash } = await connection.getLatestBlockhash();

    // Create v0 compatible message
    const messageV0 = new TransactionMessage({
      payerKey: walletProvider.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message()

    // Make a versioned transaction
    const transactionV0 = new VersionedTransaction(messageV0)

    const signature = await walletProvider.sendTransaction(
      transactionV0,
      connection as Connection
    )

    // Update Balance after 8s
    setTimeout(handleGetBalance, 8000);

    printConsole(signature);
  }

  const handleReadSC = async () => {
    if (!connection) {
      printConsole('connection not set');
      return;
    }
    if (!walletProvider || !address) {
      printConsole('walletProvider or address is undefined');
      return;
    }
  }

  const handleUnityMessage = useCallback((event: CustomEvent) => {
    var message = event.detail;
    console.log('React收到来自Unity的消息:', message, isLoaded);
    try {
      var req = JSON.parse(message) as UnityReactChannelRequest;
      // TODO dencrypt body
      var reqBody = JSON.parse(req.req);

      if ('wallet_info' === req.act) {
        CallUnityFunction('wallet_info', {
          address: address,
          balance: parseFloat(balance),
        });
      } else if ('all_my_cybors' === req.act) {
        // var _ret = convertCyborsStateToMapping(allMyCybors);
        // console.log('MyCybors-Info ::::: ', allMyCybors, _ret);
        CallUnityFunction('all_my_cybors', []);

      } else if ('mint_cybor' === req.act) {
        if (address && walletProvider && isConnected) {
          // const cyborRace = reqBody['race'].toLowerCase() as CyborRace;
          const mintCybor = async () => {
            try {
              if (!connection || !walletProvider) {
                return;
              }
              // TODO get price

              // await transaction.calculateGas();
              // await transaction.signAndSend();

              // 铸造后刷新 cybor 列表
              // fetchMyCybors();
            } catch (error) {
              // CallUnityFunction('mint_error', { message: '铸造 cybor 时出错' });
            }
          };
          mintCybor();
        } else {
          console.error('账户未准备好进行铸造');
          CallUnityFunction('mint_error', { message: '账户未准备好进行铸造' });
        }

      } else if ('uplevel_cybor' === req.act) {

        var cyborId = reqBody['cybor_id'];
        console.log('uplevel_cybor ::::: ', cyborId);

      }

    } catch (err) {
      console.debug('DEBUG:::: ' + err);
    }
  }, [isLoaded, isConnected, balance, address, walletProvider, connection, chainId]);
  useEffect(() => {
    window.addEventListener('MessageFromUnity', handleUnityMessage as EventListener);
    return () => {
      window.removeEventListener('MessageFromUnity', handleUnityMessage as EventListener);
    };
  }, [handleUnityMessage]);


  // Unity container
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const updateDimensions = useCallback(() => {
    const aspectRatio = 4 / 2.2;
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;

    if (newWidth / newHeight > aspectRatio) {
      newWidth = newHeight * aspectRatio;
    } else {
      newHeight = newWidth / aspectRatio;
    }
    setDimensions({ width: newWidth, height: newHeight });
  }, []);
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  return (
    <div className="App center-content">
      <h2>Cybor + Solana</h2>
      <p>
        <w3m-button balance="hide" />
      </p>
      {isConnected && (
        <>
          <div className="btn-container">
            <p>
              Balance: {balance}
            </p>
            <button onClick={handleFaucet}>Solana faucet</button>
            <button onClick={handleGetBalance}>Update Balance</button>
            <button onClick={handleSign}>Sign MSG</button>
            <button onClick={handleSendTransaction}>Mint Rodriguez</button>
            <button onClick={handleSendTransactionv0}>Mint Nguyen</button>
          </div>
          <br />
          <div style={{ width: dimensions.width - 500, height: dimensions.height - 260 }}>
            <Unity
              unityProvider={unityProvider}
              style={{ width: '90%', height: '80%', paddingTop: '0%', paddingLeft: '1%', paddingRight: '0%' }}
            />
            <textarea className="console" ref={txtConsoleRef} readOnly>
            </textarea>
          </div>
        </>
      )
      }

      <a href="https://miner.game.6sig.io/" target="_blank">Web site</a>
      &nbsp;&nbsp;&nbsp;
      <a href="https://github.com/6-sigma" target="_blank">Github</a>
    </div>
  );
}

export default App;
