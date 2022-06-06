import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Web3Modal, { getProviderInfo } from 'web3modal'
import { providers, Contract, utils } from 'ethers'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { NFT_CONTRACT_ADDRESS, abi } from '../contants'

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [presaleStarted, setPresaleStarted] = useState(false)
  const [presaleEnded, setPresaleEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [tokenIdsMinted, setTokenIdsMinted] = useState('0')
  const web3ModalRef = useRef()

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const { chainId } = await web3Provider.getNetwork()
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby")
      throw new Error("Change network to Rinkeby")
    }

    if (needSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }
    return web3Provider
  }

  const presaleMint = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer)

      const tx = await nftContract.presaleMint({
        value: utils.parseEther('0.01'),
      })

      setLoading(true)
      await tx.wait()
      setLoading(false)

      window.alert('You successfully minted a Crypto Devs!')
    } catch (error) {
      console.log(error)
    }
  }

  const publiceMint = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer)

      const tx = await nftContract.mint({
        value: utils.parseEther('0.01'),
      })

      setLoading(true)
      await tx.wait()
      setLoading(false)

      window.alert('You successfully minted a Crypto Devs!')
    } catch (error) {
      console.log(error)
    }
  }

  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer)

      const tx = await nftContract.startPresale()

      setLoading(true)
      await tx.wait()
      setLoading(false)

      await checkIfPresaleStarted()
    } catch (error) {
      console.log(error)
    }
  }

  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner()
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider)

      const _owner = await nftContract.owner()
      const signer = await getProviderOrSigner(true)
      const address = await signer.getAddress()

      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true)
      }
    } catch (error) {
      console.error(error.message)
    }
  }

  const checkIfPresaleStarted = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer)

      const _presaleStarted = await nftContract.presaleStarted()

      if (!_presaleStarted) {
        await getOwner()
      }

      setPresaleStarted(_presaleStarted)
      return _presaleStarted
    } catch (error) {
      console.log(error)
      return false
    }
  }

  const checkIfPresaleEnded = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer)

      const _presaleEnded = await nftContract.presaleEnded()
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000))

      if (hasEnded) {
        setPresaleEnded(true)
      } else {
        setPresaleEnded(false)
      }

      return hasEnded
    } catch (error) {
      console.log(error)
      return false
    }
  }

  const connectWallet = async () => {
    try {
      await getProviderOrSigner()
      setWalletConnected(true)
    } catch (error) {
      console.log(error)
    }
  }

  const getTokenIdsMinted = async () => {
    try {
      const provider = await getProviderOrSigner()
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider)

      const _tokenIds = await nftContract.tokenIds()
      setTokenIdsMinted(_tokenIds.toString())
    } catch (error) {
      console.log(error)
    }
  }

  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      )
    }

    if (loading) {
      return <button className={styles.button}>Loading...</button>
    }

    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      )
    }

    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      )
    }

    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a
            Crypto Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      )
    }

    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publiceMint}>
          Public Mint 🚀
        </button>
      )
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: 'rinkeby',
        providerOptions: {},
        disableInjectedProvider: false
      })
      connectWallet()

      const _presaleStarted = checkIfPresaleStarted()
      if (_presaleStarted) {
        checkIfPresaleEnded()
      }
      getTokenIdsMinted()

      const presaleEndedInterval = setInterval(async () => {
        const _presaleStarted = await checkIfPresaleStarted()
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded()
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval)
          }
        }
      }, 5 * 1000)

      setInterval(async () => {
        await getTokenIdsMinted()
      }, 5 * 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const getNFTItem = async (tokenId) => {
    const response = await axios.get(`api/${tokenId}`)
    const { name, description, image } = response.data
    setName(name)
    setImage(image)
    setDescription(description)
    tokenId++
    if (tokenId > 20) tokenId = 1
    setTimeout(() => {
      getNFTItem(tokenId)
    }, 1000)
  }
  
  useEffect(() => {
    getNFTItem(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <Head>
        <title>Whitelist Dapp</title>
        <meta name='description' content='Whitelist-Dapp' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            It's a NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src='./crypto-devs.svg' />
        </div>
        {name && <div>
          <div className={styles.description}>{name}</div>
          <div className={styles.description}>{description}</div>
          <img className={styles.image} src={image} />
        </div>}
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}
