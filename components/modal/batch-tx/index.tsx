import {
  Box,
  Text,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  ModalHeader,
  ModalCloseButton,
  useColorModeValue,
  ButtonProps,
  useToast,
} from "@chakra-ui/react";
import { useAccount, useNetwork, useProvider } from "@starknet-react/core";
import { ADDRESS_LENGTH, CONFIG_WEBSITE } from "../../../constants";
import TokenERC721Abi from "../../../constants/abi/erc721_token.json";
import TokenERC20Abi from "../../../constants/abi/token_erc20.json";
import {
  Call,
  Contract,
  GetTransactionReceiptResponse,
  TransactionStatus,
  cairo,
  shortString,
} from "starknet";
import { useState } from "react";
import GearLoader from "../../loader/GearLoader";
import { ExternalStylizedButtonLink } from "../../button/NavItem";
import { VoyagerExplorerImage } from "../../view/image/VoyagerExplorerImage";
import { BatchType } from "../../../types";
import { CHAINS_NAMES, CHAIN_IDS } from "../../../constants/address";
import { prepareCallTransfer, prepareNftCallTransfer } from "../../../utils/callback";
interface IBatchModal {
  modalOpen: boolean;
  chatId?: string;
  onClose: () => void;
  onOpen: () => void;
  restButton?: ButtonProps;
  csvData?: any[];
  verifData?: string;
  isDisabledModal?: boolean;
  isCanTryBatch?: boolean;
  batchType?: BatchType;
  summaryData?: string;
  summaryNode?: React.ReactNode;
}

const BatchTxModal = ({
  modalOpen,
  onClose,
  onOpen,
  restButton,
  csvData,
  verifData,
  isCanTryBatch,
  batchType,
  summaryData,
  summaryNode,
}: IBatchModal) => {
  const color = useColorModeValue("gray.800", "gray.300");
  const bg = useColorModeValue("gray.300", "gray.800");
  const accountStarknet = useAccount();
  const account = accountStarknet.account;
  const network = useNetwork()
  const chainId= network.chain.id
  const networkName= network.chain.name
  const address = accountStarknet?.account?.address;
  const [isBatchCanBeSend, setIsBatchCanBeSend] = useState<boolean>(false);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txState, setTxState] = useState<
    GetTransactionReceiptResponse | undefined
  >();

  const { provider } = useProvider();
  const toast = useToast();
  const calls: Call[] = [];
  const [callsData, setCallData] = useState<Call[]>([]);

  // prepare each call data to transfer amount of token to the recipient
  const prepareTx = async () => {
    try {
      console.log("csvData", csvData);
      if (csvData && csvData?.length == 0) {
        toast({
          title: "Csv data not upload correctly. Please verify your CSV",
          status: "warning",
          isClosable: true,
        });
        return;
      }
      csvData?.map(async (row, index) => {
        const tokenAddress = String(row["token_address"]);
        const lenTokenAddress = String(tokenAddress).length;

        const recipient = String(row["recipient"]);
        const lenRecipientAddress = String(recipient).length;
        const amount = String(row["amount"]);
        const token_id = String(row["token_id"]);

        /** @TODO  fix check token */
        if (
          !cairo.isTypeContractAddress(tokenAddress) &&
          ADDRESS_LENGTH != tokenAddress.length
        ) {
          // toast({
          //   title: `Wrong token address in the row number ${index}`,
          //   status:"warning"
          // });
          // return;
        }
        /** @TODO fix check recipient */
        if (
          !cairo.isTypeContractAddress(recipient) &&
          ADDRESS_LENGTH != tokenAddress.length
        ) {
          // toast({
          //   title: `Wrong recipient in the row number ${index}`,
          //   status:"warning"
          // });
          // return;
        }

        const contract = new Contract(TokenERC20Abi.abi, tokenAddress, account);
        let decimals = 18;
        let call: Call | undefined;

        if (batchType == BatchType.ERC20) {
          call = await prepareCallTransfer(
            tokenAddress,
            recipient,
            Number(amount),
            account
          );
          decimals = (await contract.decimals()) ?? 18;
          console.log("call ERC20", call);
        } else if (batchType == BatchType.ERC721) {
          call = await prepareNftCallTransfer(
            tokenAddress,
            recipient,
            Number(token_id),
            account
          );
        }
        console.log("call", call);

        if (call) {
          calls.push(call);
        }
        row["decimals"] = decimals;
        return call;
      });

      setCallData(calls);

      /** @TODO check calls data length */
      // if(calls.length !=0 ) {
      setIsBatchCanBeSend(true);
      // }

      console.log("calls", calls);
    } catch (e) {
      console.log("Error prepare tx", e);
    }
  };

  const sendTx = async () => {
    let txSend: GetTransactionReceiptResponse | undefined;

    try {
      setIsLoadingTx(true);
      setIsBatchCanBeSend(false);
      console.log("sendTx");

      if (csvData && csvData?.length == 0) {
        toast({
          title: "No data. Wait your transactions to be prepare",
          status: "warning",
        });
        return;
      }

      console.log("calls", calls);
      if (callsData && callsData?.length == 0) {
        toast({
          title: "No calldata. Wait your transactions to be prepare",
          status: "warning",
        });
        return;
      }

      console.log("calls", calls);
      // const nonce = await account?.getNonce()
      const nonce = await account?.getNonce();

      const multicall = await account.execute(callsData, undefined, {
        nonce: nonce,
      });
      setTxHash(multicall?.transaction_hash);
      toast({
        title: "Tx execute. Waiting for confirmation",
        description: `${CONFIG_WEBSITE.page.explorer}/tx/${multicall.transaction_hash}`,
        status: "info",
        isClosable: true,
      });
      let tx = await provider.waitForTransaction(multicall.transaction_hash);
      txSend = tx;
      setTxState(tx);
      console.log("tx", tx.status);
      if (
        tx.status == TransactionStatus.REJECTED ||
        tx.status == TransactionStatus.REVERTED
      ) {
        toast({
          title: `Tx failed. Please verify or contact support`,
          description: `Tx hash= ${multicall.transaction_hash}`,
          status: "error",
        });
      } else if (
        tx.status == TransactionStatus.ACCEPTED_ON_L1 ||
        tx.status == TransactionStatus.ACCEPTED_ON_L2
      ) {
        toast({
          title: `You tx multicall succeed`,
          description: `Tx hash= ${multicall.transaction_hash}`,
        });
      }
      setIsLoadingTx(false);
    } catch (e) {
      console.log("sendTx error", e);
      setIsLoadingTx(false);
      toast({
        title: `Error when sending your tx`,
        status: "error",
      });
    } finally {
      setIsLoadingTx(false);
    }
  };

  const handleClose = () => {
    setIsBatchCanBeSend(false);
    onClose();
  };
  return (
    <Box>
      <Button
        onClick={onOpen}
        bg={{ base: "brand.primary" }}
        width={"100%"}
        isDisabled={!isCanTryBatch}
        {...restButton}
      >
        Try batch
      </Button>

      <Modal
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        isOpen={modalOpen}
        onClose={() => handleClose}
        // size={"md"}
        size={"lg"}
      >
        <ModalOverlay></ModalOverlay>
        <ModalContent color={color} bg={bg} minH={{ base: "50vh" }}>
          <ModalHeader>Connect to {CONFIG_WEBSITE.title} 👋</ModalHeader>
          <ModalCloseButton onClick={handleClose} />
          <ModalBody>
            <Box
              textAlign={"left"}
              display={"grid"}
              width={"100%"}
              gap={{ base: "0.5em" }}
            >
              <Text>Beta of batchor. Please verify before send the tx</Text>

              {isLoadingTx && (
                <Box>
                  <GearLoader></GearLoader>
                </Box>
              )}
              {verifData && <Text>{verifData}</Text>}
              {summaryData && (
                <Text
                  maxW="150px" // Set the maximum width for the text
                  // overflow="hidden" // Hide any overflow content
                  whiteSpace="nowrap" // Prevent text from wrapping to the next line
                  textOverflow="ellipsis" // Show ellipsis (...) for truncated text
                >
                  {summaryData}
                </Text>
              )}

              {summaryNode}

              {txState && (
                <Box>
                  {" "}
                  {(txState?.status == TransactionStatus?.REJECTED ||
                    txState?.status == TransactionStatus?.REVERTED ||
                    txState?.status == TransactionStatus?.NOT_RECEIVED) && (
                    <Text>Tx failed or rejected</Text>
                  )}
                  {txState.status == TransactionStatus?.ACCEPTED_ON_L1 ? (
                    <Text>Accepted TX on L1 .</Text>
                  ) : (
                    txState?.status == TransactionStatus?.ACCEPTED_ON_L2 && (
                      <Text>Tx accepted in L2</Text>
                    )
                  )}
                </Box>
              )}

              {txHash && (
                <Box py={{ base: "1em" }}>
                  <ExternalStylizedButtonLink
                    href={`${CHAINS_NAMES.GOERLI == networkName.toString() ? CONFIG_WEBSITE.page.goerli_voyager_explorer:  CONFIG_WEBSITE.page.voyager_explorer}/tx/${txHash}`}
                  >
                    <VoyagerExplorerImage></VoyagerExplorerImage>
                  </ExternalStylizedButtonLink>
                </Box>
              )}

              <Box
                display={"grid"}
                gridTemplateColumns={{ md: "repeat(2,1fr)" }}
                gap={{ base: "0.5em" }}
              >
                <Button onClick={() => prepareTx()}>Prepare batch</Button>
                <Button
                  onClick={() => sendTx()}
                  isDisabled={!isBatchCanBeSend}
                  bg={{ base: "brand.primary" }}
                >
                  Batch tx
                </Button>
              </Box>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default BatchTxModal;
