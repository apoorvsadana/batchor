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
  Image as ImageChakra,
  Icon,
} from "@chakra-ui/react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
} from "@starknet-react/core";
import { CONFIG_WEBSITE } from "../../../constants";
import { ExternalStylizedButtonLink } from "../../button/NavItem";
import { installWallet } from "../../../utils/connect";
import { CHAINS_NAMES } from "../../../constants/address";
interface IAdminPanelGroup {
  modalOpen: boolean;
  chatId?: string;
  onClose: () => void;
  onOpen: () => void;
  restButton?: ButtonProps;
}

const ConnectModal = ({
  modalOpen,
  chatId,
  onClose,
  onOpen,
  restButton,
}: IAdminPanelGroup) => {
  const account = useAccount();
  const color = useColorModeValue("gray.800", "gray.300");
  const bg = useColorModeValue("gray.300", "gray.800");
  const accountStarknet = useAccount();
  const address = accountStarknet?.account?.address;
  const network = useNetwork();
  const chainId = network.chain.id;
  const networkName = network.chain.name;
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  return (
    <Box>
      <Button
        onClick={onOpen}
        bg={{ base: "brand.primary" }}
        width={"100%"}
        {...restButton}
      >
        {!address ? "Connect wallet" : "Wallet"}
      </Button>

      <Modal
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        isOpen={modalOpen}
        onClose={() => onClose}
        size={"md"}
      >
        <ModalOverlay></ModalOverlay>
        <ModalContent color={color} bg={bg} minH={{ base: "50vh" }}>
          <ModalHeader>Connect to {CONFIG_WEBSITE.title} 👋</ModalHeader>
          <ModalCloseButton onClick={onClose} />
          <ModalBody>
            {!accountStarknet?.account &&
              !accountStarknet?.account?.address && (
                <Box
                  textAlign={"left"}
                  display={"grid"}
                  width={"100%"}
                  gap={{ base: "0.5em" }}
                >
                  {connectors.map((connector, i) => {
                    return (
                      <Button
                        key={i}
                        width={{
                          base: "fit-content",
                          md: "fit-content",
                        }}
                        onClick={(e) => {
                          if (!connector.available()) {
                            installWallet(connector.id, e);
                          }
                          connect({ connector });
                        }}
                      >
                        <img
                          className="mr-2 h-7 w-7"
                          src={`https://iconic.dynamic-static-assets.com/icons/sprite.svg#${connector.id.toLocaleLowerCase()}`}
                          alt="wallet"
                        />
                        {connector.available ? "Connect " : "Install "}

                        {connector.id.charAt(0).toUpperCase() +
                          connector.id.slice(1)}
                        {/* {connector?.name} */}
                      </Button>
                    );
                  })}
                </Box>
              )}

            {accountStarknet?.account && (
              <Box>
                <Text>Address: {address}</Text>
                <Box display={"grid"} gap={{ base: "0.5em" }}>
                  <Box
                    gap={"1em"}
                    // justifyContent={"space-around"}
                    display={{ base: "block", md: "flex" }}
                  >
                    <ExternalStylizedButtonLink
                      href={`${
                        CHAINS_NAMES.GOERLI == networkName.toString()
                          ? CONFIG_WEBSITE.page.goerli_explorer
                          : CONFIG_WEBSITE.page.explorer
                      }/contract/${address}`}
                      width={"150px"}
                    >
                      Explorer
                    </ExternalStylizedButtonLink>
                    <ExternalStylizedButtonLink
                      href={`${
                        CHAINS_NAMES.GOERLI == networkName.toString()
                          ? CONFIG_WEBSITE.page.goerli_voyager_explorer
                          : CONFIG_WEBSITE.page.voyager_explorer
                      }/contract/${address}`}
                      width={"150px"}
                    >
                      {/* Voyager Explorer */}
                      <ImageChakra
                        w={{ base: "110px" }}
                        src="/assets/voyager_explorer.svg"
                      ></ImageChakra>
                    </ExternalStylizedButtonLink>
                  </Box>

                  <Button
                    w={"150px"}
                    onClick={() => {
                      disconnect();
                    }}
                  >
                    Disconnect wallet
                  </Button>
                </Box>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ConnectModal;
