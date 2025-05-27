# QEMU builds

Every time I need this, I forget it.

Needs
- `disk.raw` as the actual raw disk file to use
- `efi_vars.fd` is the non-volatile variable storage for UEFI
- `edk2-aarch64-code.fd` is the generic UEFI firmware for QEMU

```shell
qemu-system-aarch64 \
    -machine virt \
    -cpu host \
    -accel hvf \
    -smp 2 \
    -m 4G \
    -drive file=disk.raw,format=raw,if=virtio,discard=unmap \
    -netdev user,id=net0 \
    -device virtio-net-pci,netdev=net0 \
    -drive if=pflash,format=raw,file=edk2-aarch64-code.fd,readonly=on \
    -drive if=pflash,format=raw,file=efi_vars.fd \
    -nographic
```

### UEFI

How I made made the UEFI files, copying from [UTM](https://github.com/utmapp/UTM)

```shell
cp ~/Library/Containers/com.utmapp.UTM/Data/Documents/Virtual\ Machine.utm/Data/efi_vars.fd .
dd if=/dev/zero of=efi_vars.fd bs=1M count=64
dd if=efi_vars.fd.orig of=efi_vars.fd conv=notrunc

cp ~/Library/Containers/com.utmapp.UTM/Data/Library/Caches/qemu/edk2-aarch64-code.fd .
```
