import torch
from transformers import SegformerForSemanticSegmentation, SegformerConfig

CKPT = "../models/segformer_resplan.pth"
ONNX = "../models/segformer_resplan.onnx"
NUM_CLASSES = 5

cfg = SegformerConfig(
    num_labels=NUM_CLASSES,
    hidden_sizes=[64, 128, 320, 512],
    decoder_hidden_size=256
)
model = SegformerForSemanticSegmentation(cfg)
model.load_state_dict(torch.load(CKPT, map_location="cpu"))
model.eval()

dummy = torch.randn(1, 3, 512, 512)
torch.onnx.export(
    model,
    (dummy,),
    ONNX,
    input_names=["pixel_values"],
    output_names=["logits"],
    dynamic_axes={"pixel_values": {0: "batch"}, "logits": {0: "batch"}},
    opset_version=17
)
print("exported:", ONNX)