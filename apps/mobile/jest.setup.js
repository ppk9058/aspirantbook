/* eslint-env jest */

// Safe Area Context
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: ({ children, ...props }: any) => React.createElement(View, props, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Expo File System
jest.mock("expo-file-system", () => ({
  documentDirectory: "/tmp/mock-docs/",
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false, isDirectory: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn().mockResolvedValue({ uri: "/tmp/mock-docs/doc_1.pdf", status: 200 }),
  })),
}));

// Expo Keep Awake
jest.mock("expo-keep-awake", () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

// Expo Web Browser
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: "dismiss" }),
}));

// Expo Video native module mock
jest.mock("expo-video", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      loop: false,
      playbackRate: 1,
    })),
    VideoView: ({ testID, style, ...props }: any) =>
      React.createElement(View, { testID: testID || "expo-video-view", style, ...props }),
  };
});

// React Native PDF & Blob Util native modules
jest.mock("react-native-pdf", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ testID, style, ...props }: any) =>
      React.createElement(View, { testID: testID || "react-native-pdf-view", style, ...props }),
  };
});

jest.mock("react-native-blob-util", () => ({
  fs: {
    dirs: {
      CacheDir: "/tmp",
      DocumentDir: "/tmp",
    },
    exists: jest.fn().mockResolvedValue(true),
    writeFile: jest.fn().mockResolvedValue(true),
  },
}));

// React Native WebView
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    WebView: ({ testID, style, source, ...props }: any) =>
      React.createElement(View, { testID: testID || "react-native-webview", style, source, ...props }),
  };
});

// Expo Router variables prefixed with mock
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
let mockParams: Record<string, string> = {};
let mockPathname = "/";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
  usePathname: () => mockPathname,
  useSegments: () => [],
  Link: ({ children, href, onPress, ...props }: any) => {
    const React = require("react");
    const { TouchableOpacity } = require("react-native");
    return React.createElement(
      TouchableOpacity,
      {
        onPress: (e: any) => {
          if (onPress) onPress(e);
          mockPush(href);
        },
        ...props,
      },
      children
    );
  },
  __setMockParams: (params: any) => {
    mockParams = params;
  },
  __setMockPathname: (path: string) => {
    mockPathname = path;
  },
  __mockPush: mockPush,
  __mockReplace: mockReplace,
  __mockBack: mockBack,
}));
