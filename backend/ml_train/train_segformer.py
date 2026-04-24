import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from transformers import SegformerForSemanticSegmentation, SegformerConfig
from dataset_resplan import ResPlanSegDataset

PKL = "../data/ResPlan.pkl"
OUT = "../models/segformer_resplan.pth"
NUM_CLASSES = 5  # bg,wall,door,window,room

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    ds = ResPlanSegDataset(PKL, size=512)
    n_val = int(0.1 * len(ds))
    n_train = len(ds) - n_val
    tr, va = random_split(ds, [n_train, n_val])

    trl = DataLoader(tr, batch_size=4, shuffle=True, num_workers=2)
    val = DataLoader(va, batch_size=4, shuffle=False, num_workers=2)

    cfg = SegformerConfig(
        num_labels=NUM_CLASSES,
        hidden_sizes=[64, 128, 320, 512],
        decoder_hidden_size=256
    )
    model = SegformerForSemanticSegmentation(cfg)
    model.to(device)

    opt = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    ce = nn.CrossEntropyLoss()

    for epoch in range(20):
        model.train()
        total = 0.0
        for x, y in trl:
            x, y = x.to(device), y.to(device)
            out = model(pixel_values=x).logits
            out = nn.functional.interpolate(out, size=y.shape[-2:], mode="bilinear", align_corners=False)
            loss = ce(out, y)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += float(loss.item())
        print(f"epoch {epoch+1}: train_loss={total/len(trl):.4f}")

    torch.save(model.state_dict(), OUT)
    print("saved:", OUT)

if __name__ == "__main__":
    main()