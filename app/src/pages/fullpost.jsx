import { AnchorProvider, Program } from '@project-serum/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPostById } from 'src/context/functions/getPostById';
import idl from 'src/idl.json';

const PROGRAM_KEY = new PublicKey(idl.metadata.address);

function getProgram(provider) {
  return new Program(idl, PROGRAM_KEY, provider);
}

export const FullPost = () => {
  const { id } = useParams();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [provider, setProvider] = useState();
  const [post, setPost] = useState();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (provider) {
        const getPost = async () => {
          setIsLoading(true);
          const program = getProgram(provider);
          const post = await getPostById(id.toString(), program);
          setPost(post);
          setIsLoading(false);
        };
        getPost();
      }
    } catch {}
  }, [provider]);

  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);
    }
  }, [connection, wallet]);

  return (
    <article className="background-color h-screen">
      {isLoading ? (
        <p className='text-gray-400'>Loading...</p>
      ) : (
        <>
          <div>
            <h2 className="text-white text-2xl font-bold">{post?.title}</h2>
          </div>

          <div className="text-gray-400 text-start mt-10">
            <p>{post?.content}</p>
          </div>
        </>
      )}
    </article>
  );
};
