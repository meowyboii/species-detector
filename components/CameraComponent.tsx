import { _View, StyleSheet } from "react-native";
import React, { useState, useRef } from "react";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Button, TouchableOpacity } from "react-native";
import { Text, View } from "@/components/Themed";
import * as MediaLibrary from "expo-media-library";
import { Image } from "expo-image";
import { FontAwesome6, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import GalleryComponent from "./GalleryComponent";

export default function CameraComponent() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const router = useRouter();

  const toggleCameraFacing = () => {
    setFacing((curr) => (curr === "back" ? "front" : "back"));
  };

  const takePicture = async () => {
    if (!ref.current) return;
    try {
      const photo = await ref.current.takePictureAsync();
      if (photo) {
        setUri(photo.uri);
        savePicture(photo.uri);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
    }
  };

  const savePicture = async (uri: string) => {
    try {
      if (!mediaPermission) {
        return null;
      }
      if (mediaPermission.status !== "granted") {
        await requestMediaPermission();
      }
      // Create an album to store all the images
      const asset = await MediaLibrary.createAssetAsync(uri);
      const album = await MediaLibrary.getAlbumAsync("ZooView");
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync("ZooView", asset, false);
      }
      console.log("Image saved locally!");

      // Redirect to detect-species page
      redirect(uri);
    } catch (error) {
      console.error("Error saving picture:", error);
    }
  };

  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri: uri,
      type: "image/jpeg",
      name: "animal.jpg",
    } as any);
    formData.append("upload_preset", "species-detector");
    formData.append("width", "750");
    formData.append("height", "1000");
    formData.append("crop", "limit");
    formData.append("quality", "auto");
    formData.append("fetch_format", "auto");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      console.log("Upload successful!");
      const imageLink = data.secure_url;
      return imageLink;
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // Save image to cloud and redirect to detect-species page
  const redirect = async (uri: string) => {
    // Upload image online
    const imageLink = await uploadImage(uri);

    // Open detect-species page and pass the uri and image link
    router.push({
      pathname: "/detect-species",
      params: { uri: uri, imageLink: imageLink },
    });
  };

  const renderCamera = () => {
    if (!cameraPermission) {
      return null;
    }
    if (!cameraPermission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.permissionText}>
            We need your permission to show the camera
          </Text>
          <Button onPress={requestCameraPermission} title="Grant Permission" />
        </View>
      );
    }
    return (
      <CameraView
        style={styles.camera}
        ref={ref}
        facing={facing}
        responsiveOrientationWhenOrientationLocked
      >
        <View style={styles.closeContainer}>
          <TouchableOpacity onPress={() => router.push("/(tabs)")}>
            <AntDesign name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <View style={styles.button}>
            <GalleryComponent uri={uri} setUri={setUri} redirect={redirect} />
          </View>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <View style={styles.shutterBtn}>
              <View style={styles.shutterBtnInner} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </CameraView>
    );
  };
  const renderPicture = () => {
    return (
      <View style={styles.imageContainer}>
        <Image
          source={{ uri }}
          contentFit="contain"
          style={{ aspectRatio: 1 }}
        />
        <View style={styles.overlay}>
          <TouchableOpacity onPress={() => setUri(null)}>
            <Text style={styles.buttonText}>Take a New Picture</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  return <>{uri ? renderPicture() : renderCamera()}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    flex: 1,
    flexDirection: "row",
  },
  camera: {
    flex: 1,
    width: "100%",
    padding: 15,
    justifyContent: "space-between",
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: "white",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  closeContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    backgroundColor: "transparent",
    paddingHorizontal: 10,
  },
  button: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  permissionText: {
    fontSize: 17,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
