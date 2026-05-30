---
title: "Reversing1"
date: 2026-05-26
notion_page_id: "236d0542-16a9-8013-a73b-e87b0b93c197"
notion_order: 14
description: "reversing2"
---
# 1. Debugging 실습 - 1

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-1.png)

Correct! 값을 출력하는 FLAG를 찾아서 입력하는 문제

```c
__int64 __fastcall main(int argc, char **argv, char **envp)
{
  _BYTE s1[64]; // [rsp+10h] [rbp-90h] BYREF
  _BYTE input[72]; // [rsp+50h] [rbp-50h] BYREF
  unsigned __int64 v6; // [rsp+98h] [rbp-8h]

  v6 = __readfsqword(0x28u);
  printf("FLAG: ");
  __isoc99_scanf("%64s", input);
  sub_11C9((__int64)s1);
  if ( !memcmp(s1, input, 0x20u) )
    puts("Correct!");
  else
    puts("Wrong!");
  return 0;
}
```

IDA 로 분석한 main문

scanf로 input에 값을 입력받고, `sub_11c9` 로 계산된 s1과 이를 비교하여 값이 똑같으면 Correct를 출력한다.

```c
void __fastcall sub_11C9(__int64 a1)
{
  int i; // [rsp+1Ch] [rbp-14h]

  for ( i = 0; i <= 63; ++i )
    *(_BYTE *)(i + a1) = sub_12DF(byte_5020[i]);
}
```

sub_11C9에서는 sub_12DF 함수를 이용해서 s1을 가져오는데, 저 sub_12DF함수의 코드가 연산하기가 매우 까다롭게 생겨서 정적분석으로는 문제를 풀 수 없게 만들어져 있다.

gdb를 이용해서 문제를 풀어보자.

1. ` if ( !memcmp(s1, input, 0x20u) )`<br>
memcmp 함수에 중단점을 걸고, s1에 어떤 값이 들어가는지를 확인하면 될 것이다.
1. 

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-2.png)

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-3.png)

memcmp의 주소는 129B인데, 이걸 그대로 쓰면 안되고 base주소에 더해서 실제 매핑된 주소를 구해야 한다.

base주소는 gdb의 vmmap 명령어로 확인할 수 있고, 값은 `0x0000555555554000`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-4.png)

x64 운영체제에서 함수의 인자값이 레지스터에 들어가는 순서는 rdi, rsi, rdx, rcx … 순이다.

`memcmp(s1, input, 0x20u)`

s1 : rdi

input : rsi

0x20 : rdx

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-5.png)

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-6.png)

`0x7fffffffdda0: "CyKor{e766dd0f763d31c079ed2aa9767bf0cbc91f37a29d960abb212392223}`

그러므로 flag는 `CyKor{e766dd0f763d31c079ed2aa9767bf0cbc91f37a29d960abb212392223}`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-7.png)

# 2. Debugging 실습 - 2

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-8.png)

```c
__int64 __fastcall main(int argc, char **argv, char **envp)
{
  int i; // [rsp+Ch] [rbp-54h]
  _BYTE input[72]; // [rsp+10h] [rbp-50h] BYREF
  unsigned __int64 v6; // [rsp+58h] [rbp-8h]

  v6 = __readfsqword(0x28u);
  printf("input: ");
  __isoc99_scanf("%48s");
  sub_11EC((__int64)input);
  for ( i = 0; i <= 47; ++i )
  {
    if ( byte_5020[i] != input[i] )
    {
      puts("Wrong!");
      return 0;
    }
  }
  puts("Correct!");
  return 0;
}
```

input을 받아와서, sub_11EC 함수로 값을 변경 후에 byte_5020과 비교하여 같을 경우 Correct를 출력한다.

```c
void __fastcall sub_11EC(unsigned __int8 *input)
{
  int i; // [rsp+1Ch] [rbp-4h]

  sub_11A9();
  for ( i = 0; i <= 47; ++i )
    input[i] = byte_5080[input[i]];
}
```

```c
void sub_11A9()
{
  int i; // [rsp+Ch] [rbp-4h]

  for ( i = 0; i <= 255; ++i )
    byte_5080[i] = sub_130D((unsigned __int8)i);
}
```

sub_130D 역시 정적분석으로는 코드를 확인하기 어렵게 되어있어있다.

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-9.png)

sub_11A9함수를 실행시킨 후에 byte_5080을 gdb로 확인해보자

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-10.png)

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-11.png)

byte_5080는 다음과 같이 구할 수 있다.

```markdown
0xb6    0x49    0x4c    0x3f    0xba    0x4d    0xf0    0xe3
0xce    0xa1    0x44    0x77    0x92    0x85    0x68    0x9b
0xc6    0xd9    0x9c    0xcf    0xca    0x5d    0x40    0xb3
0x5e    0xb1    0x94    0xc7    0xe2    0xd5    0x38    0xeb
0xd6    0x69    0xec    0x5f    0xda    0x6d    0x90    0x83
0xee    0xc1    0x64    0x17    0x32    0xa5    0x08    0x3b
0xe6    0x79    0xbc    0xef    0xea    0xfd    0xe0    0xd3
0xfe    0xd1    0x34    0x67    0x82    0x75    0x58    0x0b
0xf6    0x89    0x8c    0x7f    0xfa    0x8d    0x30    0x23
0x0e    0xe1    0x84    0xb7    0xd2    0xc5    0xa8    0xdb
0x06    0x19    0xdc    0x0f    0x0a    0x9d    0x80    0xf3
0x9e    0xf1    0xd4    0x07    0x22    0x15    0x78    0x2b
0x16    0xa9    0x2c    0x9f    0x1a    0xad    0xd0    0xc3
0x2e    0x01    0xa4    0x57    0x72    0xe5    0x48    0x7b
0x26    0xb9    0xfc    0x2f    0x2a    0x3d    0x20    0x13
0x3e    0x11    0x74    0xa7    0xc2    0xb5    0x98    0x4b
0x36    0xc9    0xcc    0xbf    0x3a    0xcd    0x70    0x63
0x4e    0x21    0xc4    0xf7    0x12    0x05    0xe8    0x1b
0x46    0x59    0x1c    0x4f    0x4a    0xdd    0xc0    0x33
0xde    0x31    0x14    0x47    0x62    0x55    0xb8    0x6b
0x56    0xe9    0x6c    0xdf    0x5a    0xed    0x10    0x03
0x6e    0x41    0xe4    0x97    0xb2    0x25    0x88    0xbb
0x66    0xf9    0x3c    0x6f    0x6a    0x7d    0x60    0x53
0x7e    0x51    0xb4    0xe7    0x02    0xf5    0xd8    0x8b
0x76    0x09    0x0c    0xff    0x7a    0x0d    0xb0    0xa3
0x8e    0x61    0x04    0x37    0x52    0x45    0x28    0x5b
0x86    0x99    0x5c    0x8f    0x8a    0x1d    0x00    0x73
0x1e    0x71    0x54    0x87    0xa2    0x95    0xf8    0xab
0x96    0x29    0xac    0x1f    0x9a    0x2d    0x50    0x43
0xae    0x81    0x24    0xd7    0xf2    0x65    0xc8    0xfb
0xa6    0x39    0x7c    0xaf    0xaa    0xbd    0xa0    0x93
0xbe    0x91    0xf4    0x27    0x42    0x35    0x18    0xcb
```

update[i] = byte_5080(flag[i])

byte_5020[i] = update[i]

역연산을 통해 update을 먼저 구해 보자

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-12.png)

update은 byte_5020와 같기 때문에 그대로 값을 가져다 쓰면된다.

```c
for ( i = 0; i <= 47; ++i )
input[i] = byte_5080[input[i]];
}
```

ex) `update[0] = byte_5080[flag[0]]`

update[0] = 0x7f

byte_5080[0x43] == 0x7f 이므로

flag[0]= 0x40 == C

이를 코드로 작성해보자

```c
byte_5020 = [
   0x7F, 0x11, 0xB7, 0x7B, 0xFC, 0xA7, 0xE0, 0x2C, 0xFE, 0xBC, 
  0xE0, 0xEA, 0xEA, 0x2C, 0x1A, 0xD0, 0xD1, 0xBC, 0xFE, 0xAD, 
  0xFD, 0xBC, 0x79, 0x79, 0xEA, 0xFD, 0x79, 0xD1, 0xD3, 0xE6, 
  0xD3, 0xA9, 0xFE, 0xFD, 0xA9, 0x1A, 0x2C, 0xA9, 0xD1, 0xD0, 
  0xFE, 0x2C, 0xBC, 0xA9, 0xEF, 0xE6, 0xAD, 0xB5]

byte_5080 = [
    0xb6, 0x49, 0x4c, 0x3f, 0xba, 0x4d, 0xf0, 0xe3,
    0xce, 0xa1, 0x44, 0x77, 0x92, 0x85, 0x68, 0x9b,
    0xc6, 0xd9, 0x9c, 0xcf, 0xca, 0x5d, 0x40, 0xb3,
    0x5e, 0xb1, 0x94, 0xc7, 0xe2, 0xd5, 0x38, 0xeb,
    0xd6, 0x69, 0xec, 0x5f, 0xda, 0x6d, 0x90, 0x83,
    0xee, 0xc1, 0x64, 0x17, 0x32, 0xa5, 0x08, 0x3b,
    0xe6, 0x79, 0xbc, 0xef, 0xea, 0xfd, 0xe0, 0xd3,
    0xfe, 0xd1, 0x34, 0x67, 0x82, 0x75, 0x58, 0x0b,
    0xf6, 0x89, 0x8c, 0x7f, 0xfa, 0x8d, 0x30, 0x23,
    0x0e, 0xe1, 0x84, 0xb7, 0xd2, 0xc5, 0xa8, 0xdb,
    0x06, 0x19, 0xdc, 0x0f, 0x0a, 0x9d, 0x80, 0xf3,
    0x9e, 0xf1, 0xd4, 0x07, 0x22, 0x15, 0x78, 0x2b,
    0x16, 0xa9, 0x2c, 0x9f, 0x1a, 0xad, 0xd0, 0xc3,
    0x2e, 0x01, 0xa4, 0x57, 0x72, 0xe5, 0x48, 0x7b,
    0x26, 0xb9, 0xfc, 0x2f, 0x2a, 0x3d, 0x20, 0x13,
    0x3e, 0x11, 0x74, 0xa7, 0xc2, 0xb5, 0x98, 0x4b,
    0x36, 0xc9, 0xcc, 0xbf, 0x3a, 0xcd, 0x70, 0x63,
    0x4e, 0x21, 0xc4, 0xf7, 0x12, 0x05, 0xe8, 0x1b,
    0x46, 0x59, 0x1c, 0x4f, 0x4a, 0xdd, 0xc0, 0x33,
    0xde, 0x31, 0x14, 0x47, 0x62, 0x55, 0xb8, 0x6b,
    0x56, 0xe9, 0x6c, 0xdf, 0x5a, 0xed, 0x10, 0x03,
    0x6e, 0x41, 0xe4, 0x97, 0xb2, 0x25, 0x88, 0xbb,
    0x66, 0xf9, 0x3c, 0x6f, 0x6a, 0x7d, 0x60, 0x53,
    0x7e, 0x51, 0xb4, 0xe7, 0x02, 0xf5, 0xd8, 0x8b,
    0x76, 0x09, 0x0c, 0xff, 0x7a, 0x0d, 0xb0, 0xa3,
    0x8e, 0x61, 0x04, 0x37, 0x52, 0x45, 0x28, 0x5b,
    0x86, 0x99, 0x5c, 0x8f, 0x8a, 0x1d, 0x00, 0x73,
    0x1e, 0x71, 0x54, 0x87, 0xa2, 0x95, 0xf8, 0xab,
    0x96, 0x29, 0xac, 0x1f, 0x9a, 0x2d, 0x50, 0x43,
    0xae, 0x81, 0x24, 0xd7, 0xf2, 0x65, 0xc8, 0xfb,
    0xa6, 0x39, 0x7c, 0xaf, 0xaa, 0xbd, 0xa0, 0x93,
    0xbe, 0x91, 0xf4, 0x27, 0x42, 0x35, 0x18, 0xcb
]

flag = []

for i in range(0, 48, 1):
    for j in range(0, 256, 1):
        if byte_5080[j] == byte_5020[i]:
            flag.append(j)


print(''.join(chr(c) for c in flag))
```

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-13.png)

### 개선 코드

python에는 `list.index()`  메서드를 이용해 인덱스를 빠르게 찾아낼 수 있다.

`flag = [byte_5080.index(b) for b in byte_5020]`

# 3. packed

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-14.png)

```c
__int64 __fastcall main(int argc, char **argv, char **envp)
{
  _BYTE input[72]; // [rsp+0h] [rbp-50h] BYREF
  unsigned __int64 v5; // [rsp+48h] [rbp-8h]

  v5 = __readfsqword(0x28u);
  printf("FLAG: ");
  __isoc99_scanf("%48s", input);
  if ( (*(unsigned __int8 (__fastcall **)(_BYTE *))byte_1401)(input) )
    puts("Correct!");
  else
    puts("Wrong!");
  return 0;
```

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-15.png)

강의에서 말씀하신것처럼, ida로는 분석하기 힘들게 packing이 되어있다고 한다. 이를 gdb로 분석해보자.

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-16.png)

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-17.png)

main문에 중단점을 걸고 프로그램을 실행한다.

`if ( (*(unsigned __int8 (__fastcall **)(_BYTE *))byte_1401)(input) )`

작동을 알고싶은 함수는 byte_1401 위치에 있으므로 여기에 중단점을 건다.

```assembly
gef➤  x/42i  0x555555555520
=> 0x555555555520:      endbr64
   0x555555555524:      push   rbp
   0x555555555525:      mov    rbp,rsp
   0x555555555528:      sub    rsp,0x50
   0x55555555552c:      mov    rax,QWORD PTR fs:0x28
   0x555555555535:      mov    QWORD PTR [rbp-0x8],rax
   0x555555555539:      xor    eax,eax
   0x55555555553b:      lea    rax,[rip+0xb37]        # 0x555555556079
   0x555555555542:      mov    rdi,rax
   0x555555555545:      mov    eax,0x0
   0x55555555554a:      call   0x5555555550e0         # printf
   0x55555555554f:      lea    rax,[rbp-0x50]
   0x555555555553:      mov    rsi,rax
   0x555555555556:      lea    rax,[rip+0xb23]        # 0x555555556080
   0x55555555555d:      mov    rdi,rax
   0x555555555560:      mov    eax,0x0
   0x555555555565:      call   0x555555555120         # scanf
   0x55555555556a:      lea    rax,[rbp-0x50]
   0x55555555556e:      mov    rdi,rax
   0x555555555571:      call   0x555555555401         # byte_1401
   0x555555555576:      test   al,al
   0x555555555578:      je     0x55555555558b
   0x55555555557a:      lea    rax,[rip+0xb04]        # 0x555555556085
   0x555555555581:      mov    rdi,rax
   0x555555555584:      call   0x5555555550c0         # puts
   0x555555555589:      jmp    0x55555555559a
   0x55555555558b:      lea    rax,[rip+0xafc]        # 0x55555555608e
   0x555555555592:      mov    rdi,rax
   0x555555555595:      call   0x5555555550c0         # puts
   0x55555555559a:      mov    eax,0x0
   0x55555555559f:      mov    rdx,QWORD PTR [rbp-0x8]
   0x5555555555a3:      sub    rdx,QWORD PTR fs:0x28
   0x5555555555ac:      je     0x5555555555b3
   0x5555555555ae:      call   0x5555555550d0        
   0x5555555555b3:      leave
   0x5555555555b4:      ret
   0x5555555555b5:      add    BYTE PTR [rax],al
   0x5555555555b7:      add    bl,dh
   0x5555555555b9:      nop    edx
   0x5555555555bc:      sub    rsp,0x8
   0x5555555555c0:      add    rsp,0x8
   0x5555555555c4:      ret
gef➤
```

byte_1401  위치의 함수

rdi에는 input이 있다.

```assembly
gef➤  x/120i 0x555555555401
   0x555555555401:      endbr64
   0x555555555405:      push   rbp
   0x555555555406:      mov    rbp,rsp
=> 0x555555555409:      sub    rsp,0x30
   0x55555555540d:      mov    QWORD PTR [rbp-0x28],rdi
   0x555555555411:      mov    rax,QWORD PTR fs:0x28
   0x55555555541a:      mov    QWORD PTR [rbp-0x8],rax
   0x55555555541e:      xor    eax,eax
   0x555555555420:      mov    DWORD PTR [rbp-0x18],0x0
   0x555555555427:      jmp    0x5555555554b0
   0x55555555542c:      mov    eax,DWORD PTR [rbp-0x18]
   0x55555555542f:      add    eax,eax
   0x555555555431:      cdqe
   0x555555555433:      lea    rdx,[rax*4+0x0]
   0x55555555543b:      mov    rax,QWORD PTR [rbp-0x28]
   0x55555555543f:      add    rax,rdx
   0x555555555442:      mov    eax,DWORD PTR [rax]
   0x555555555444:      mov    DWORD PTR [rbp-0x10],eax
   0x555555555447:      mov    eax,DWORD PTR [rbp-0x18]
   0x55555555544a:      add    eax,eax
   0x55555555544c:      cdqe
   0x55555555544e:      add    rax,0x1
   0x555555555452:      lea    rdx,[rax*4+0x0]
   0x55555555545a:      mov    rax,QWORD PTR [rbp-0x28]
   0x55555555545e:      add    rax,rdx
   0x555555555461:      mov    eax,DWORD PTR [rax]
   0x555555555463:      mov    DWORD PTR [rbp-0xc],eax
   0x555555555466:      lea    rax,[rbp-0x10]
   0x55555555546a:      mov    rdi,rax
   0x55555555546d:      call   0x555555555341
   0x555555555472:      mov    eax,DWORD PTR [rbp-0x18]
   0x555555555475:      add    eax,eax
   0x555555555477:      cdqe
   0x555555555479:      lea    rdx,[rax*4+0x0]
   0x555555555481:      mov    rax,QWORD PTR [rbp-0x28]
   0x555555555485:      add    rdx,rax
   0x555555555488:      mov    eax,DWORD PTR [rbp-0x10]
   0x55555555548b:      mov    DWORD PTR [rdx],eax
   0x55555555548d:      mov    eax,DWORD PTR [rbp-0x18]
   0x555555555490:      add    eax,eax
   0x555555555492:      cdqe
   0x555555555494:      add    rax,0x1
   0x555555555498:      lea    rdx,[rax*4+0x0]
   0x5555555554a0:      mov    rax,QWORD PTR [rbp-0x28]
   0x5555555554a4:      add    rdx,rax
   0x5555555554a7:      mov    eax,DWORD PTR [rbp-0xc]
   0x5555555554aa:      mov    DWORD PTR [rdx],eax
   0x5555555554ac:      add    DWORD PTR [rbp-0x18],0x1
   0x5555555554b0:      cmp    DWORD PTR [rbp-0x18],0x5
   0x5555555554b4:      jle    0x55555555542c
   0x5555555554ba:      mov    DWORD PTR [rbp-0x14],0x0
   0x5555555554c1:      jmp    0x5555555554ff
   0x5555555554c3:      mov    eax,DWORD PTR [rbp-0x14]
   0x5555555554c6:      cdqe
   0x5555555554c8:      lea    rdx,[rax*4+0x0]
   0x5555555554d0:      mov    rax,QWORD PTR [rbp-0x28]
   0x5555555554d4:      add    rax,rdx
   0x5555555554d7:      mov    edx,DWORD PTR [rax]
   0x5555555554d9:      mov    eax,DWORD PTR [rbp-0x14]
   0x5555555554dc:      cdqe
   0x5555555554de:      lea    rcx,[rax*4+0x0]
   0x5555555554e6:      lea    rax,[rip+0xb53]        # 0x555555556040
   0x5555555554ed:      mov    eax,DWORD PTR [rcx+rax*1]
   0x5555555554f0:      cmp    edx,eax
   0x5555555554f2:      je     0x5555555554fb
   0x5555555554f4:      mov    eax,0x0
   0x5555555554f9:      jmp    0x55555555550a
   0x5555555554fb:      add    DWORD PTR [rbp-0x14],0x1
   0x5555555554ff:      cmp    DWORD PTR [rbp-0x14],0xb
   0x555555555503:      jle    0x5555555554c3
   0x555555555505:      mov    eax,0x1
   0x55555555550a:      mov    rdx,QWORD PTR [rbp-0x8]
   0x55555555550e:      sub    rdx,QWORD PTR fs:0x28
   0x555555555517:      je     0x55555555551e
   0x555555555519:      call   0x5555555550d0
   0x55555555551e:      leave
   0x55555555551f:      ret
   0x555555555520:      endbr64
   0x555555555524:      push   rbp
   0x555555555525:      mov    rbp,rsp
   0x555555555528:      sub    rsp,0x50
   0x55555555552c:      mov    rax,QWORD PTR fs:0x28
   0x555555555535:      mov    QWORD PTR [rbp-0x8],rax
   0x555555555539:      xor    eax,eax
   0x55555555553b:      lea    rax,[rip+0xb37]        # 0x555555556079
   0x555555555542:      mov    rdi,rax
   0x555555555545:      mov    eax,0x0
   0x55555555554a:      call   0x5555555550e0
   0x55555555554f:      lea    rax,[rbp-0x50]
   0x555555555553:      mov    rsi,rax
   0x555555555556:      lea    rax,[rip+0xb23]        # 0x555555556080
   0x55555555555d:      mov    rdi,rax
   0x555555555560:      mov    eax,0x0
   0x555555555565:      call   0x555555555120
   0x55555555556a:      lea    rax,[rbp-0x50]
   0x55555555556e:      mov    rdi,rax
   0x555555555571:      call   0x555555555401
   0x555555555576:      test   al,al
   0x555555555578:      je     0x55555555558b
   0x55555555557a:      lea    rax,[rip+0xb04]        # 0x555555556085
   0x555555555581:      mov    rdi,rax
   0x555555555584:      call   0x5555555550c0
   0x555555555589:      jmp    0x55555555559a
   0x55555555558b:      lea    rax,[rip+0xafc]        # 0x55555555608e
   0x555555555592:      mov    rdi,rax
   0x555555555595:      call   0x5555555550c0
   0x55555555559a:      mov    eax,0x0
   0x55555555559f:      mov    rdx,QWORD PTR [rbp-0x8]
   0x5555555555a3:      sub    rdx,QWORD PTR fs:0x28
   0x5555555555ac:      je     0x5555555555b3
   0x5555555555ae:      call   0x5555555550d0
   0x5555555555b3:      leave
   0x5555555555b4:      ret
   0x5555555555b5:      add    BYTE PTR [rax],al
   0x5555555555b7:      add    bl,dh
   0x5555555555b9:      nop    edx
   0x5555555555bc:      sub    rsp,0x8
   0x5555555555c0:      add    rsp,0x8
   0x5555555555c4:      ret
   0x5555555555c5:      add    BYTE PTR [rax],al
```

` b * 0x0000555555554000+0x1520`

`b* 0x555555555571`

`b * 0x5555555554b4`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-18.png)

rdi(input)을 `rbp-0x28`에 저장

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-19.png)

rbp-0x18를 반복문의 index로 사용하여 반복문 진행 총 6회

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-20.png)

`0x555555555442                  mov    eax, DWORD PTR [rax]`

`$rax   : 0x64636261`

입력은 `abcdefgh` 로 줬는데 “abcd”만 rax 레지스터에 저장되었다. 데이터를 4바이트씩 쪼개서 처리하는 것 같다.

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-21.png)

다음 값은 “efgh”가 들어간다.

` b *  0x55555555546d`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-22.png)

함수 내에서도 값 조작으로 보이는 것을 0x18번 진행한다.

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-23.png)

반복문이 끝난 이후

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-24.png)

rbp-0x14

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-25.png)

진행을 계속하다 보니 함수가 끝나고 Wrong을 출력한다.  값 검증 → 틀린 경우 0을 리턴하는 것으로 생각된다.

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-26.png)

rip + 0xb53 = 0x555555556040

`$rax   : 0x0000555555556040  →  0x395c01a76c9ff429`

`$rdx   : 0xd7aba022`

두 값을 비교 → 같으면  `0x5555555554fb` 로 jmp, 다르면 `0x55555555550a` 로 jmp

`0x5555555554fb`  : 위에서 봤던 0xb와 `rbp-0x14`  값 비교하는 부분

`0x55555555550a`  : 함수를 끝내고 Wrong 출력하는 부분

즉 입력값을 함수 처리하고 `0x0000555555556040` 와 비교( 0xb번),

값이 일치할 경우 1 리턴

값이 다를경우 0 리턴

0x0000555555556040 - 0x0000555555554000 = 0x2040

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-27.png)

0x2040에는 다음과 같이 값이 설정되어 있다.

input → update

update와 0x2040byte와 비교

→ 전부 같게 하는 update값 찾기

`0x555555555571`  부터 어셈블리어를 분석해보자.

input : `aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkk`

```assembly
=> 0x555555555433:      lea    rdx,[rax*4+0x0]
   0x55555555543b:      mov    rax,QWORD PTR [rbp-0x28]
   0x55555555543f:      add    rax,rdx
   0x555555555442:      mov    eax,DWORD PTR [rax]
   0x555555555444:      mov    DWORD PTR [rbp-0x10],eax
   0x555555555447:      mov    eax,DWORD PTR [rbp-0x18]
   0x55555555544a:      add    eax,eax
   0x55555555544c:      cdqe
   0x55555555544e:      add    rax,0x1
   0x555555555452:      lea    rdx,[rax*4+0x0]
   0x55555555545a:      mov    rax,QWORD PTR [rbp-0x28]
   0x55555555545e:      add    rax,rdx
   0x555555555461:      mov    eax,DWORD PTR [rax]
   0x555555555463:      mov    DWORD PTR [rbp-0xc],eax
   0x555555555466:      lea    rax,[rbp-0x10]
   0x55555555546a:      mov    rdi,rax
   0x55555555546d:      call   0x555555555341
```

0x55555555544c

를 기준으로 rax 값을 1 증가 시킨 후 같은 로직을 실행하는데,  위에는 0x61616161을 `rbp-0x10` 에 저장하고,

아래는 0x62626262를 `rbp-0xc` 에 저장.  이 값들을 rdi(함수 인자)로 다시 저장하고  `0x555555555341` 를 호출한다.

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-28.png)

rdi 레지스터에 “aaaabbbb”가 저장되어있는것을 확인 할 수 있다.

`b *  0x555555555341`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-29.png)

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-30.png)

`rbp-0x18` = 0x61616161

`rbp-0x14` = 0x62626262

`rbp-0x10` = 0

`rbp-0x8`  = 0x7f4a7c15

`rbp-0x4` = 0x18

`rbp-0xc` = 0 —> 반복문 index

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-31.png)

이후  `0x55555555537c                  jmp    0x5555555553e0`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-32.png)

0x18 == 24번 반복

```assembly
gef➤  x/40i  0x55555555537e
   0x55555555537e:      mov    eax,DWORD PTR [rbp-0x8]
=> 0x555555555381:      add    DWORD PTR [rbp-0x10],eax
   0x555555555384:      mov    eax,DWORD PTR [rbp-0x14]
   0x555555555387:      shl    eax,0x7
   0x55555555538a:      mov    edx,0xa56babcd
   0x55555555538f:      lea    ecx,[rax+rdx*1]
   0x555555555392:      mov    edx,DWORD PTR [rbp-0x14]
   0x555555555395:      mov    eax,DWORD PTR [rbp-0x10]
   0x555555555398:      add    eax,edx
   0x55555555539a:      xor    ecx,eax
   0x55555555539c:      mov    edx,ecx
   0x55555555539e:      mov    eax,DWORD PTR [rbp-0x14]
   0x5555555553a1:      shr    eax,0x4
   0x5555555553a4:      mov    ecx,0xff123
   0x5555555553a9:      add    eax,ecx
   0x5555555553ab:      xor    eax,edx
   0x5555555553ad:      add    DWORD PTR [rbp-0x18],eax
   0x5555555553b0:      mov    eax,DWORD PTR [rbp-0x18]
   0x5555555553b3:      shl    eax,0x5
   0x5555555553b6:      mov    edx,0xdeadbeef
   0x5555555553bb:      lea    ecx,[rax+rdx*1]
   0x5555555553be:      mov    edx,DWORD PTR [rbp-0x18]
   0x5555555553c1:      mov    eax,DWORD PTR [rbp-0x10]
   0x5555555553c4:      add    eax,edx
   0x5555555553c6:      xor    ecx,eax
   0x5555555553c8:      mov    edx,ecx
   0x5555555553ca:      mov    eax,DWORD PTR [rbp-0x18]
   0x5555555553cd:      shr    eax,0x3
   0x5555555553d0:      mov    ecx,0xfacefeed
   0x5555555553d5:      add    eax,ecx
   0x5555555553d7:      xor    eax,edx
   0x5555555553d9:      add    DWORD PTR [rbp-0x14],eax
   0x5555555553dc:      add    DWORD PTR [rbp-0xc],0x1
```

`rbp-0x10`  = 0 + 0x7f4a7c15  = 0x7f4a7c15

$eax = 0x62626262 `<< 7` = 0x31313100

$edx = `0xa56babcd`

$ecx  = 0x31313100 + 0xa56babcd = 0xd69cdccd

$edx = 0x62626262

$eax = `0x7f4a7c15`

$eax = 0x7f4a7c15 + 0x62626262 = 0xe1acde77

$ecx = 0xd69cdccd `^` 0xe1acde77 = 0x373002ba

$edx = 0x373002ba

$eax = 0x62626262 `>> 4` = 0x06262626

$ecx =` 0xff123`

$eax = 0x06262626 + 0xff123 = 0x06361749

$eax = 0x06361749 `^` 0x373002ba = 0x310615f3

$rbp-0x18 = 0x61616161 `+`  0x310615f3 = 0x92677754

$eax = 0x92677754

$eax = 0x92677754 `<< 5`  = 0x4ceeea80

$edx =  `0xdeadbeef`

$ecx = 0x4ceeea80 + 0xdeadbeef = 0x2b9ca96f

$edx = 0x92677754

$eax = `0x7f4a7c15`

$eax = 0x7f4a7c15 + 0x92677754 = 0x11b1f369

$ecx = 0x2b9ca96f `^` 0x11b1f369 = 0x3a2d5a06

$edx = 0x3a2d5a06

$eax =  0x92677754

$eax = 0x92677754 `>> 3`  = 0x124ceeea

$ecx = `0xfacefeed`

$eax = 0x124ceeea + 0xfacefeed = 0xd1bedd7

$eax = 0xd1bedd7 `^` 0x3a2d5a06 =  0x3736b7d1

$rbp-0x14 = 0x62626262 `+`  0x3736b7d1 = 0x99991a33

$rbp-0xc +=1 ( 반복 index)

→ 이를 반복함(24회)

`0x555555555341`  함수를 enc함수라고 하자

인자는 하나로 들어오는데 편의상 두개로 들어온다고 가정

ex) a1 : aaaa a2 : bbbb

```python
v1 = 0xa56babcd
v2 = 0x7f4a7c15
v3 = 0xff123
v4 = 0xdeadbeef
v5 = 0xfacefeed


def enc(a1, a2):
	for i in range(24):
		a1 = (a1 + (((a2 << 7) + v1) ^ (a2 + v2) ^ ((a2 >> 4) + v3))) & 0xffffffff
		a2 = (a2 +(((a1 << 5) +  v4) ^ (a1 + v2) ^ ((a1 >> 3) + v5))) & 0xffffffff
	return a1, a2
```

놓친 부분이 있는데

`0x55555555537e:      mov    eax,DWORD PTR [rbp-0x8]<br>
 0x555555555381:      add    DWORD PTR [rbp-0x10],eax<br>
 0x555555555384:      mov    eax,DWORD PTR [rbp-0x14]`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-33.png)

`$rbp - 0x10` 은 `0x7f4a7c15` 라는 고정값을 사용하는 것이 아니라, 매 반복마다 값을 더해서 합산한 값을 사용한다.

다시 코드를 짜보면

```assembly
v0 = 0x7f4a7c15
v1 = 0xa56babcd
v3 = 0xff123
v4 = 0xdeadbeef
v5 = 0xfacefeed


def enc(a1, a2):
	v2 = 0
	for i in range(24):
		v2 += v0
		a1 = (a1 + (((a2 << 7) + v1) ^ (a2 + v2) ^ ((a2 >> 4) + v3))) & 0xffffffff
		a2 = (a2 +(((a1 << 5) +  v4) ^ (a1 + v2) ^ ((a1 >> 3) + v5))) & 0xffffffff
	return a1, a2
```

```assembly
gef➤  x/13i 0x5555555553e0
   0x5555555553e0:      mov    eax,DWORD PTR [rbp-0xc]
   0x5555555553e3:      cmp    eax,DWORD PTR [rbp-0x4]
=> 0x5555555553e6:      jb     0x55555555537e
   0x5555555553e8:      mov    rax,QWORD PTR [rbp-0x28]
   0x5555555553ec:      mov    edx,DWORD PTR [rbp-0x18]
   0x5555555553ef:      mov    DWORD PTR [rax],edx
   0x5555555553f1:      mov    rax,QWORD PTR [rbp-0x28]
   0x5555555553f5:      lea    rdx,[rax+0x4]
   0x5555555553f9:      mov    eax,DWORD PTR [rbp-0x14]
   0x5555555553fc:      mov    DWORD PTR [rdx],eax
   0x5555555553fe:      nop
   0x5555555553ff:      pop    rbp
   0x555555555400:      ret
```

enc로 변경한 값을 원래 input이 있었던 주소에 입력. 즉 input값 업데이트

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-34.png)

다음 8바이트에 대해서 반복 진행 “ccccdddd”

48바이트를 검증하는 거니까 총 6회 진행하는 것이 맞다.

역연산 코드를 작성해보자!

```python
a2 = (a2 - (((a1 << 5) +  v4) ^ (a1 + v2) ^ ((a1 >> 3) + v5))) & 0xffffffff
a1 = (a1 - (((a2 << 7) + v1) ^ (a2 + v2) ^ ((a2 >> 4) + v3))) & 0xffffffff
```

최종 코드

```assembly
byte_2040 = [
  0x29, 0xF4, 0x9F, 0x6C, 0xA7, 0x01, 0x5C, 0x39, 0x1E, 0xBA, 
  0xFA, 0x79, 0x1E, 0x0C, 0x96, 0x4B, 0x29, 0xE7, 0x29, 0x3C, 
  0xCB, 0x4B, 0xDA, 0xEA, 0x57, 0xED, 0xBE, 0x31, 0x20, 0x56, 
  0x87, 0x69, 0x81, 0x05, 0x0B, 0x44, 0x08, 0xB1, 0x23, 0xA6, 
  0x38, 0x95, 0xAB, 0x9C, 0xB5, 0xC5, 0x01, 0xAB ]


v0 = 0x7f4a7c15
v1 = 0xa56babcd
v3 = 0xff123
v4 = 0xdeadbeef
v5 = 0xfacefeed

for i in range(6):
    a1 =  int.from_bytes(byte_2040[i*8 : i*8 +4], 'little')
    a2 = int.from_bytes(byte_2040[i*8 + 4 : i*8 +8], 'little')
    v2 = (v0 * 24) & 0xffffffff
    for j in range(24):
        a2 = (a2 - (((a1 << 5) +  v4) ^ (a1 + v2) ^ ((a1 >> 3) + v5))) & 0xffffffff
        a1 = (a1 - (((a2 << 7) + v1) ^ (a2 + v2) ^ ((a2 >> 4) + v3))) & 0xffffffff
        v2 -= v0
    a1 = a1.to_bytes(4, 'little')
    a2 = a2.to_bytes(4, 'little')
    print((a1 + a2).decode('ascii'))

```

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-35.png)

`CyKor{b8b5f7ba51c1ada6c19978081c9e32aaa468fcf4a}`

![Reversing1](/assets/img/posts/reversing/2026-05-26-reversing-36.png)
