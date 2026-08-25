import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Slider,
  CircularProgress,
} from "@mui/material";
import Cropper from "react-easy-crop";

const LogoCropperModal = ({
  open,
  image,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [aspect, setAspect] = useState(1);

  // Follow the uploaded image's own proportions instead of forcing 1:1,
  // so a wide/tall logo isn't chopped down to a square.
  const handleMediaLoaded = ({ naturalWidth, naturalHeight }) => {
    if (naturalWidth && naturalHeight) {
      setAspect(naturalWidth / naturalHeight);
    }
  };

  const handleCropChange = (crop) => {
    setCrop(crop);
  };

  const handleZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      alert("Please adjust the crop area");
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const { x, y, width, height } = croppedAreaPixels;
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                alert("Failed to process image");
                return;
              }
              try {
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64Data = reader.result;
                  await onSave(base64Data);
                };
                reader.readAsDataURL(blob);
              } catch (err) {
                alert("Error processing image");
              }
            },
            // PNG, not JPEG: logos are routinely uploaded with a transparent
            // background, and JPEG has no alpha channel — exporting this canvas
            // as JPEG composites every transparent pixel to black, which then
            // shows up as a black box behind the logo on the certificate.
            "image/png"
          );
        } catch (err) {
          alert("Error processing image");
        }
      };
      img.onerror = () => {
        alert("Failed to load image");
      };
      img.src = image;
    } catch (err) {
      alert("Error processing image");
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setAspect(1);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Crop Logo</span>
        <IconButton size="small" onClick={handleClose} disabled={isLoading}>
          ×
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 2,
        }}
      >
        {image && (
          <>
            <Box
              sx={{
                mb: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#666",
                }}
              >
                Drag to move • Scroll to zoom • Resize handles to adjust crop
                area
              </Typography>
            </Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "400px",
                backgroundColor: "#f0f0f0",
              }}
            >
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onMediaLoaded={handleMediaLoaded}
                onCropChange={handleCropChange}
                onCropComplete={handleCropComplete}
                onZoomChange={handleZoomChange}
              />
            </Box>
            <Box
              sx={{
                mt: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#666",
                  display: "block",
                  mb: 1,
                }}
              >
                Zoom: {(zoom * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={zoom}
                onChange={(e, newZoom) => handleZoomChange(newZoom)}
                min={1}
                max={3}
                step={0.1}
                valueLabelDisplay="auto"
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
        }}
      >
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? "Uploading..." : "Save Crop"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogoCropperModal;
