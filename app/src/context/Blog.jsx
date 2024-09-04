import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAvatarUrl } from 'src/functions/getAvatarUrl';
import { getRandomName } from 'src/functions/getRandomName';
import idl from 'src/idl.json';
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes';

const BlogContext = createContext();

// Get Program Key
const PROGRAM_KEY = new PublicKey(idl.metadata.address);

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error('Parent must be wrapped inside PostsProvider');
  }

  return context;
};

export const BlogProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [initialized, setInitialized] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [posts, setPosts] = useState([])

  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new anchor.AnchorProvider(
        connection,
        anchorWallet,
        anchor.AnchorProvider.defaultOptions()
      );
      return new anchor.Program(idl, PROGRAM_KEY, provider);
    }
  }, [connection, anchorWallet]);

  useEffect(() => {
    const start = async () => {
      if (program && publicKey) {
        try {
          // Check if there is a user account
          setTransactionPending(true);
          const [userPda] = await findProgramAddressSync(
            [utf8.encode('user'), publicKey.toBuffer()],
            program.programId
          );
          const user = await program.account.userAccount.fetch(userPda);
          console.log('USER: ', user);
          if (user) {
            setUser(user);
            setInitialized(true);
          }
          fetchAllPosts();
        } catch (error) {
          console.log('Find user error: ', error);
          setInitialized(false);
        } finally {
          setTransactionPending(false);
        }
      }
    };

    start();
  }, [program, publicKey]);

  const initUser = async () => {
    if (program && publicKey) {
      try {
        setTransactionPending(true);
        const name = getRandomName();
        const avatar = getAvatarUrl(publicKey.toString());
        const [userPda] = await findProgramAddressSync(
          [utf8.encode('user'), publicKey.toBuffer()],
          program.programId
        );
        const tx = await program.methods
          .initUser(name, avatar)
          .accounts({
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log('Initialize user tx: ', tx);
        const user = await program.account.userAccount.fetch(userPda);
        setUser(user);
        setInitialized(true);
      } catch (error) {
        console.log('Initialize user error: ', error);
      } finally {
        setTransactionPending(false);
      }
    }
  };

  const createPost = async (title, content) => {
    if (program && publicKey) {
      try {
        setTransactionPending(true);
        const [userPda] = await findProgramAddressSync(
          [utf8.encode('user'), publicKey.toBuffer()],
          program.programId
        );
        const user = await program.account.userAccount.fetch(userPda);
        const [postPda] = await findProgramAddressSync(
          [
            utf8.encode('post'),
            publicKey.toBuffer(),
            Uint8Array.from([user.lastPostId]),
          ],
          program.programId
        );
        const tx = await program.methods
          .createPost(title, content)
          .accounts({
            postAccount: postPda,
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log('Create post tx: ', tx);
        const post = await program.account.postAccount.fetch(postPda);
        console.log('POST: ', post);
        fetchAllPosts();
        setShowModal(false);
      } catch (error) {
        console.log('Create post error: ', error);
      } finally {
        setTransactionPending(false);
      }
    }
  };

  const fetchAllPosts = async () => {
    if (program) {
      try {
        const postAccounts = await program.account.postAccount.all();
        console.log('POSTS: ', postAccounts);
        setPosts(postAccounts);
      } catch (error) {
        console.log('Fetch posts error: ', error);
      }
    }
  }

  return (
    <BlogContext.Provider
      value={{
        user,
        initialized,
        transactionPending,
        initUser,
        showModal,
        setShowModal,
        createPost,
        posts
      }}
    >
      {children}
    </BlogContext.Provider>
  );
};
