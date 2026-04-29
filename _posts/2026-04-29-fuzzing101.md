---
title: "[Fuzzing101] Exercise 3 - TCPdump"
date: 2026-04-29
notion_page_id: "34fd0542-16a9-8007-9af6-efc52f6d2d6d"
notion_order: 7
categories: [블로그/기술문서]
description: "Fuzzing101- Exercise 3"
---
In this exercise we will fuzz **TCPdump** packet analyzer. The goal is to find a crash/PoC for [**CVE-2017-13028**](https://www.cvedetails.com/cve/CVE-2017-13028/) in TCPdump 4.9.2.

`print-bootp.c:bootp_print().` 에서 Out-of-bounds Read vulneratibily가 발생했다고 한다.  퍼징을 통해 취약점을 확인하고, 패치까지 진행하자.

# **TCPdump**

tcpdump는 네트워크 패킷을 캡처하고 분석하는 CLI 도구이다.

웹사이트에 접속하거나, 서버와 통신하거나, DNS 요청을 보낼 때 실제로 네트워크에는 여러 패킷이 오가는데, tcpdump는 그 패킷을 잡아서 보여준다

# Do it yourself!

In order to complete this exercise, you need to:

1. Find an efficient way to fuzz TCPdump
1. Try to figure out how to enable ASan for fuzzing
1. Fuzz TCPdump until you have a few unique crashes
1. Triage the crashes to find a PoC for the vulnerability
1. Fix the issue

## Find an efficient way to fuzz TCPdump

TCPdump는 보통 두 가지 입력을 받는다.

`tcpdump-i eth0` : 실시간 네트워크 인터페이스 입력

`tcpdump-r sample.pcap` : 저장된 pcap 파일 입력

실시간 네트워크보다는 .pcap를 반복적으로 변이하면서 퍼징을 하는게 분석할 때 효율적일 것이다.

## Try to figure out how to enable ASan for fuzzing

ASan은 이미 exercise2에서 사용했으므로 똑같이 사용해준다.

### `tcpdump` 설치

```bash
wget https://github.com/the-tcpdump-group/tcpdump/archive/refs/tags/tcpdump-4.9.1.tar.gz
tar -xzvf tcpdump-4.9.1.tar.gz
```

### `libpcap` 설치 및 빌드

```bash
wget https://github.com/the-tcpdump-group/libpcap/archive/refs/tags/libpcap-1.8.0.tar.gz
tar -xzvf libpcap-1.8.0.tar.gz
mv libpcap-libpcap-1.8.0/ libpcap-1.8.0

cd ./libpcap-1.8.0
./configure --enable-shared=no
make
```

### `tcpdump` 빌드

```bash
cd $HOME/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/
./configure --prefix="$HOME/fuzzing_tcpdump/install/"
make
make install
```

![[Fuzzing101] Exercise 3 - TCPdump](/assets/img/posts/fuzzing101/2026-04-29-fuzzing101-1.png)

잘 빌드가 되었다.

### AFL++ LTO + ASan으로 다시 빌드

```c
cd ./tcpdump-tcpdump-4.9.1
make distclean || true

export CC=afl-clang-lto
export CXX=afl-clang-lto++
export AFL_USE_ASAN=1

./configure --prefix="$HOME/fuzzing_tcpdump/install-asan/"
make -j"$(nproc)"
make install
```

## Fuzz TCPdump until you have a few unique crash

ASan은 메모리 사용량이 크므로  `-m none` 옵션을 걸어준다.

`-nn`  은 tcpdump가 이름 해석하지 않게 하는 출력 옵션이다.

```c
unset ASAN_OPTIONS
afl-fuzz -m none -i in -o out -s 123 -- ./tcpdump-tcpdump-4.9.1/tcpdump -nn -r @@
```

![[Fuzzing101] Exercise 3 - TCPdump](/assets/img/posts/fuzzing101/2026-04-29-fuzzing101-2.png)

4시간 가량 돌려서 2개의 크래시를 찾았지만 둘 다 해당 CVE와는 관련 없었다.

`/test`  폴더에서 dhcp 관련 pcap 만 골라서 다시 시드로 사용하여 퍼징을 돌렸다.

`-v`  : 출력을 더 자세히 보여줌. v가 붙을 수록 더 자세히 보여줌

`-X`  :  패킷 내용을 hex + ASCII 형태로 출력 `-XX`  사용시 링크 레벨 헤더까지 포함해서 출력

`-ee`  : 링크 레벨 헤더 정보를 더 자세히 출력

`-nn`  : IP 주소를 호스트 이름으로 바꾸지 않음,  포트 번호도 서비스 이름으로 바꾸지 않음

```bash
afl-fuzz -m none -i in -o out -s 123 -- ./tcpdump-tcpdump-4.9.1/tcpdump -vvvvXX -ee -nn -r @@
```

![[Fuzzing101] Exercise 3 - TCPdump](/assets/img/posts/fuzzing101/2026-04-29-fuzzing101-3.png)

추가 퍼징을 진행했으나 동일 크래시를 안정적으로 재현하지 못해, 최종적으로는 공식 테스트/재현용 패킷 파일에서 파생한 near-crash seed를 초기 입력으로 사용하여 bootp_print()의 heap-buffer-overflow를 재현했다

## Triage

```bash
==2477915==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x606000000114 at pc 0x58a86ca0d453 bp 0x7ffd2a3a8b10 sp 0x7ffd2a3a8b08
READ of size 2 at 0x606000000114 thread T0
    #0 0x58a86ca0d452 in EXTRACT_16BITS /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./extract.h:144:20
    #1 0x58a86ca0d452 in bootp_print /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-bootp.c:325:2
    #2 0x58a86ca0d452 in udp_print /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-udp.c:582:4
    #3 0x58a86c86bd8c in ip_print_demux /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-ip.c:387:3
    #4 0x58a86c871f95 in ip_print /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-ip.c:658:3
    #5 0x58a86c8207cc in ethertype_print /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-ether.c:333:10
    #6 0x58a86c81e361 in ether_print /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-ether.c:236:7
    #7 0x58a86c78b69c in pretty_print_packet /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print.c:339:18
    #8 0x58a86c78b69c in print_packet /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./tcpdump.c:2506:2
    #9 0x58a86c774066 in pcap_offline_read /home/kseo/fuzzing_tcpdump/libpcap-1.8.0/./savefile.c:507:5
    #10 0x58a86c7582e7 in pcap_loop /home/kseo/fuzzing_tcpdump/libpcap-1.8.0/./pcap.c:875:8
    #11 0x58a86c78607a in main /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./tcpdump.c:2009:12
    #12 0x7b5e97a29d8f in __libc_start_call_main csu/../sysdeps/nptl/libc_start_call_main.h:58:16
    #13 0x7b5e97a29e3f in __libc_start_main csu/../csu/libc-start.c:392:3
    #14 0x58a86c699f14 in _start (/home/kseo/fuzzing_tcpdump/install-asan/sbin/tcpdump+0x2baf14) (BuildId: acbc177bc4dceaf8)

0x606000000114 is located 0 bytes to the right of 52-byte region [0x6060000000e0,0x606000000114)
allocated by thread T0 here:
    #0 0x58a86c71cd5e in malloc (/home/kseo/fuzzing_tcpdump/install-asan/sbin/tcpdump+0x33dd5e) (BuildId: acbc177bc4dceaf8)
    #1 0x58a86c774c6f in pcap_check_header /home/kseo/fuzzing_tcpdump/libpcap-1.8.0/./sf-pcap.c:401:14

SUMMARY: AddressSanitizer: heap-buffer-overflow /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./extract.h:144:20 in EXTRACT_16BITS
Shadow bytes around the buggy address:
  0x0c0c7fff7fd0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff7fe0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff7ff0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c0c7fff8000: fa fa fa fa fd fd fd fd fd fd fd fd fa fa fa fa
  0x0c0c7fff8010: 00 00 00 00 00 00 00 06 fa fa fa fa 00 00 00 00
=>0x0c0c7fff8020: 00 00[04]fa fa fa fa fa fd fd fd fd fd fd fd fd
  0x0c0c7fff8030: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8040: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8050: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8060: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c0c7fff8070: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
Shadow byte legend (one shadow byte represents 8 application bytes):
  Addressable:           00
  Partially addressable: 01 02 03 04 05 06 07
  Heap left redzone:       fa
  Freed heap region:       fd
  Stack left redzone:      f1
  Stack mid redzone:       f2
  Stack right redzone:     f3
  Stack after return:      f5
  Stack use after scope:   f8
  Global redzone:          f9
  Global init order:       f6
  Poisoned by user:        f7
  Container overflow:      fc
  Array cookie:            ac
  Intra object redzone:    bb
  ASan internal:           fe
  Left alloca redzone:     ca
  Right alloca redzone:    cb
==2477915==ABORTING
[1]    2477915 IOT instruction  ./install-asan/sbin/tcpdump -vvvvXX -ee -nn -r
➜  fuzzing_tcpdump
```

- 오류 유형 : `heap-buffer-overflow`
- 접근 종류 : `READ of size 2 at 0x606000000114 thread T0`

`memcpy` 에서 크래시 발생

- 실제 발생지점 : 
    `bootp_print /home/kseo/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1/./print-bootp.c:325:2`
- 실제 호출 흐름 : 

`EXTRACT_16BITS` → `bootp_print` → `udp_print` → `ip_print_demux` → `ip_print` → `ethertype_print` → `ether_print` → `print_packet` → `main`

### GDB로 크래시 파일 실행

```bash
gdb --args ./install-asan/sbin/tcpdump -vvvvXX -ee -nn -r ./out_final/default/crashes/id:000000,sig:06,src:000000,time:741,execs:350,op:flip1,pos:16
```

```bash
=ERROR: AddressSanitizer: heap-buffer-overflow on address 0x606000000114 at pc 0x58a86ca0d453 bp 0x7ffd2a3a8b10 sp 0x7ffd2a3a8b08
READ of size 2 at 0x606000000114 thread T0
```

```bash
pwndbg> bt
#0  __pthread_kill_implementation (no_tid=0, signo=6, threadid=140737352330432) at ./nptl/pthread_kill.c:44
#1  __pthread_kill_internal (signo=6, threadid=140737352330432) at ./nptl/pthread_kill.c:78
#2  __GI___pthread_kill (threadid=140737352330432, signo=signo@entry=6) at ./nptl/pthread_kill.c:89
#3  0x00007ffff7642476 in __GI_raise (sig=sig@entry=6) at ../sysdeps/posix/raise.c:26
#4  0x00007ffff76287f3 in __GI_abort () at ./stdlib/abort.c:79
#5  0x00005555558b6137 in __sanitizer::Abort() ()
#6  0x00005555558b3f51 in __sanitizer::Die() ()
#7  0x00005555558963e7 in __asan::ScopedInErrorReport::~ScopedInErrorReport() ()
#8  0x000055555589920f in __asan::ReportGenericError(unsigned long, unsigned long, unsigned long, unsigned long, bool, unsigned long, unsigned int, bool) ()
#9  0x0000555555899d88 in __asan_report_load2 ()
#10 0x0000555555b82453 in EXTRACT_16BITS (p=0x606000000054) at ./extract.h:144
#11 bootp_print (ndo=0x7fffffffda40, cp=0x60600000004a "", length=59384) at ./print-bootp.c:325
#12 udp_print (ndo=0x7fffffffda40, bp=0x606000000042 "B", length=59384, bp2=0x60600000002e "E", fragmented=<optimized out>) at ./print-udp.c:582
#13 0x00005555559e0d8d in ip_print_demux (ndo=0x2bdc4d, ipds=0x7fffffffc000) at ./print-ip.c:387
#14 0x00005555559e6f96 in ip_print (ndo=<optimized out>, bp=<optimized out>, length=<optimized out>) at ./print-ip.c:658
#15 0x00005555559957cd in ethertype_print (ndo=0x7fffffffda40, ether_type=<optimized out>, p=0x2bdc4d <error: Cannot access memory at address 0x2bdc4d>, length=65556, caplen=38, src=0x7fffffffc260, dst=0x7fffffffc280) at ./print-ether.c:333
#16 0x0000555555993362 in ether_print (ndo=<optimized out>, p=<optimized out>, length=65556, caplen=38, print_encap_header=<optimized out>, encap_header_arg=<optimized out>) at ./print-ether.c:236
#17 0x000055555590069d in pretty_print_packet (ndo=0x7fffffffda40, packets_captured=<optimized out>, h=<optimized out>, sp=<optimized out>) at ./print.c:339
#18 print_packet (user=user@entry=0x7fffffffda40 "", h=h@entry=0x7fffffffc430, sp=0x606000000020 "") at ./tcpdump.c:2506
#19 0x00005555558e9067 in pcap_offline_read (p=p@entry=0x616000000080, cnt=cnt@entry=-1, callback=callback@entry=0x555555900500 <print_packet>, user=user@entry=0x7fffffffda40 "") at ./savefile.c:507
#20 0x00005555558cd2e8 in pcap_loop (p=0x616000000080, cnt=-1, callback=0x555555900500 <print_packet>, user=0x7fffffffda40 "") at ./pcap.c:875
#21 0x00005555558fb07b in main (argc=<optimized out>, argv=<optimized out>) at ./tcpdump.c:2009
#22 0x00007ffff7629d90 in __libc_start_call_main (main=main@entry=0x5555558f6070 <main>, argc=argc@entry=6, argv=argv@entry=0x7fffffffdf28) at ../sysdeps/nptl/libc_start_call_main.h:58
#23 0x00007ffff7629e40 in __libc_start_main_impl (main=0x5555558f6070 <main>, argc=6, argv=0x7fffffffdf28, init=<optimized out>, fini=<optimized out>, rtld_fini=<optimized out>, stack_end=0x7fffffffdf18) at ../csu/libc-start.c:392
#24 0x000055555580ef15 in _start ()
pwndbg>
```

### frame 10

```bash
pwndbg> frame 10
#10 0x0000555555b82453 in EXTRACT_16BITS (p=0x606000000054) at ./extract.h:144
144             return ((uint16_t)ntohs(*(const uint16_t *)(p)));
pwndbg> p p
$3 = (const void *) 0x606000000054
pwndbg> list
139      * cast the pointer and fetch through it.
140      */
141     static inline uint16_t
142     EXTRACT_16BITS(const void *p)
143     {
144             return ((uint16_t)ntohs(*(const uint16_t *)(p)));
145     }
146
147     static inline uint32_t
148     EXTRACT_32BITS(const void *p)
```

`0x606000000054 is located 0 bytes to the right of 52-byte region [0x606000000020,0x606000000054)`

힙의 마지막 주소인 `0x606000000054`  를 `ntohs` 함수의 인자로 전달한다.

`ntohs`  : 네트워크 바이트 순서(빅 엔디안)로 된 2바이트 unsigned short 정수를 호스트(PC) 바이트 순서로 변환하는 함수<br>
<br>
네트워크에서 온 포트번호 `0x1234`가 들어왔을 때, 리틀 엔디안 컴퓨터는 이를 `0x3412`로 인식할 수 있으므로, `ntohs()`를 사용하여 실제 값인 `0x1234`로 올바르게 재배열<br>
<br>
<br>
즉 버퍼 끝인 `0x606000000054`  에서 2바이트를 READ 하려 해서 힙 버퍼 오버플로우가 발생했다.

### frame 11

```bash
pwndbg> frame 11
#11 bootp_print (ndo=0x7fffffffda40, cp=0x60600000004a "", length=59384) at ./print-bootp.c:325
325             ND_PRINT((ndo, ", Flags [%s]",
pwndbg> info locals
bp = 0x60600000004a
ul = <optimized out>
pwndbg> list
320             if (EXTRACT_32BITS(&bp->bp_xid))
321                     ND_PRINT((ndo, ", xid 0x%x", EXTRACT_32BITS(&bp->bp_xid)));
322             if (EXTRACT_16BITS(&bp->bp_secs))
323                     ND_PRINT((ndo, ", secs %d", EXTRACT_16BITS(&bp->bp_secs)));
324
325             ND_PRINT((ndo, ", Flags [%s]",
326                       bittok2str(bootp_flag_values, "none", EXTRACT_16BITS(&bp->bp_flags))));
327             if (ndo->ndo_vflag > 1)
328                     ND_PRINT((ndo, " (0x%04x)", EXTRACT_16BITS(&bp->bp_flags)));
329
pwndbg> p &bp->bp_flags
$7 = (uint16_t *) 0x606000000054
pwndbg> p sizeof(struct bootp)
$ = 300
```

`&bp→bp_flags`  가 `p` 가 되어 `EXTRACT_16BITS`  함수로 들어가는데, 해당 값이 힙 버퍼 내부에 있는지 확인하는 코드가 없다.

```c
struct bootp {
	uint8_t		bp_op;		/* packet opcode type */
	uint8_t		bp_htype;	/* hardware addr type */
	uint8_t		bp_hlen;	/* hardware addr length */
	uint8_t		bp_hops;	/* gateway hops */
	uint32_t	bp_xid;		/* transaction ID */
	uint16_t	bp_secs;	/* seconds since boot began */
	uint16_t	bp_flags;	/* flags - see bootp_flag_values[]
					   in print-bootp.c */
	struct in_addr	bp_ciaddr;	/* client IP address */
	struct in_addr	bp_yiaddr;	/* 'your' IP address */
	struct in_addr	bp_siaddr;	/* server IP address */
	struct in_addr	bp_giaddr;	/* gateway IP address */
	uint8_t		bp_chaddr[16];	/* client hardware address */
	uint8_t		bp_sname[64];	/* server host name */
	uint8_t		bp_file[128];	/* boot file name */
	uint8_t		bp_vend[64];	/* vendor-specific area */
} UNALIGNED;
...

register const struct bootp *bp;

...
bp = (const struct bootp *)cp;
```

다음과 같이 지역변수 `bp`를 선언

`bp` 가 힙 내부의 `bootp` 구조체를 가르키게 됨

(0x7fffffffbda8주소에 있는 bp) → (0x60600000004a 주소에 있는 bootp의 구조체)

`&bp->bp_flags  = &(bp->bp_flags)`  라고 한다. 우선순위에서 `->` 연산이 우선이다.

`bp = (const struct bootp *)cp;`  이므로 `cp`  다음 프레임을 확인해보자

### frame 12

```c
pwndbg> frame 12
#12 udp_print (ndo=0x7fffffffda40, bp=0x606000000042 "B", length=59384, bp2=0x60600000002e "E", fragmented=<optimized out>) at ./print-udp.c:582
582                             bootp_print(ndo, (const u_char *)(up + 1), length);
pwndbg> list
577                     else if (IS_SRC_OR_DST_PORT(TIMED_PORT))
578                             timed_print(ndo, (const u_char *)(up + 1));
579                     else if (IS_SRC_OR_DST_PORT(TFTP_PORT))
580                             tftp_print(ndo, (const u_char *)(up + 1), length);
581                     else if (IS_SRC_OR_DST_PORT(BOOTPC_PORT) || IS_SRC_OR_DST_PORT(BOOTPS_PORT))
582                             bootp_print(ndo, (const u_char *)(up + 1), length);
583                     else if (IS_SRC_OR_DST_PORT(RIP_PORT))
584                             rip_print(ndo, (const u_char *)(up + 1), length);
585                     else if (IS_SRC_OR_DST_PORT(AODV_PORT))
586                             aodv_print(ndo, (const u_char *)(up + 1), length,
pwndbg> info locals
ep = <optimized out>
up = 0x606000000042
ip = 0x60600000002e
ip6 = <optimized out>
sport = 16896
dport = 68
ulen = 59384
cp = 0x60600000004a ""
pwndbg>
```

`(const u_char *)(up + 1)  = 0x60600000004a`

결국 위에서 말했듯이, `&bp→bp_flags`  가 `p` 가 되어 `EXTRACT_16BITS`  함수로 들어가는데, 해당 값이 힙 버퍼 내부에 있는지 확인하는 코드가 없다는 것이 해당 크래시가 발생한 이유이다

## fix the issue

`bootp` 구조체의 사이즈가 300이기 때문에  `bootp_print` 함수 시작 전에 `cp + 300`이 유효한 범위인지 확인하는 코드를 추가해서 좀 보수적으로 수정해 보기로 했다.

`ND_TCHECK(bp->bp_op);`  라는 형식으로 체크하는게 있다.

```c
#define ND_TTEST2(var, l) \
  (IS_NOT_NEGATIVE(l) && \
	((uintptr_t)ndo->ndo_snapend - (l) <= (uintptr_t)ndo->ndo_snapend && \
         (uintptr_t)&(var) <= (uintptr_t)ndo->ndo_snapend - (l)))
         
#define ND_TCHECK2(var, l) if (!ND_TTEST2(var, l)) goto trunc

#define ND_TCHECK(var) ND_TCHECK2(var, sizeof(var))
```

`(uintptr_t)ndo->ndo_snapend - (l) <= (uintptr_t)ndo->ndo_snapend`

언더플로우 방지

`(uintptr_t)&(var) <= (uintptr_t)ndo->ndo_snapend - (l)`

`var` 주소부터 `ㅣ` 만큼 읽어도 `ndo→ndo_snapend` 값을 넘지 않는지 검사하는 것이다.

참고로 ndo의 구조체는 아래와 같다.

```c
struct netdissect_options {
  int ndo_bflag;		/* print 4 byte ASes in ASDOT notation */
  int ndo_eflag;		/* print ethernet header */
  int ndo_fflag;		/* don't translate "foreign" IP address */
  int ndo_Kflag;		/* don't check TCP checksums */
  int ndo_nflag;		/* leave addresses as numbers */
  int ndo_Nflag;		/* remove domains from printed host names */
  int ndo_qflag;		/* quick (shorter) output */
  int ndo_Sflag;		/* print raw TCP sequence numbers */
  int ndo_tflag;		/* print packet arrival time */
  int ndo_uflag;		/* Print undecoded NFS handles */
  int ndo_vflag;		/* verbosity level */
  int ndo_xflag;		/* print packet in hex */
  int ndo_Xflag;		/* print packet in hex/ascii */
  int ndo_Aflag;		/* print packet only in ascii observing TAB,
				 * LF, CR and SPACE as graphical chars
				 */
  int ndo_Hflag;		/* dissect 802.11s draft mesh standard */
  int ndo_packet_number;	/* print a packet number in the beginning of line */
  int ndo_suppress_default_print; /* don't use default_print() for unknown packet types */
  int ndo_tstamp_precision;	/* requested time stamp precision */
  const char *program_name;	/* Name of the program using the library */

  char *ndo_espsecret;
  struct sa_list *ndo_sa_list_head;  /* used by print-esp.c */
  struct sa_list *ndo_sa_default;

  char *ndo_sigsecret;		/* Signature verification secret key */

  int   ndo_packettype;	/* as specified by -T */

  int   ndo_snaplen;

  /*global pointers to beginning and end of current packet (during printing) */
  const u_char *ndo_packetp;
  const u_char *ndo_snapend;

  /* pointer to the if_printer function */
  if_printer ndo_if_printer;

  /* pointer to void function to output stuff */
  void (*ndo_default_print)(netdissect_options *,
			    register const u_char *bp, register u_int length);

  /* pointer to function to do regular output */
  int  (*ndo_printf)(netdissect_options *,
		     const char *fmt, ...)
#ifdef __ATTRIBUTE___FORMAT_OK_FOR_FUNCTION_POINTERS
		     __attribute__ ((format (printf, 2, 3)))
#endif
```

`ndo_snapend` 는 현재 처리중인 패킷의 마지막 주소이므로 이 값을 통해 경계값 검사를 한다.

```c
bootp_print(netdissect_options *ndo,
	    register const u_char *cp, u_int length)
{

	
	register const struct bootp *bp;
	static const u_char vm_cmu[4] = VM_CMU;
	static const u_char vm_rfc1048[4] = VM_RFC1048;
	
	ND_TCHECK2(*cp, sizeof(struct bootp));

	bp = (const struct bootp *)cp;
	ND_TCHECK(bp->bp_op);
...
```

`ND_TCHECK2(*cp, sizeof(struct bootp));`**  **를 추가하여 경계값 검사를 한다.

```c
cd $HOME/fuzzing_tcpdump/tcpdump-tcpdump-4.9.1
make distclean || true

./configure --prefix="$HOME/fuzzing_tcpdump/install-patched/"
make -j"$(nproc)"
make install
```

```c
➜  fuzzing_tcpdump ./install-patched/sbin/tcpdump -vvvvXX -ee -nn -r ./out_final/default/crashes/id:000000,sig:06,src:000000,time:741,execs:350,op:flip1,pos:16
reading from file ./out_final/default/crashes/id:000000,sig:06,src:000000,time:741,execs:350,op:flip1,pos:16, link-type EN10MB (Ethernet)
09:00:01.000000 c0:ff:ff:80:00:9d > 00:0c:fb:49:96:7e, ethertype IPv4 (0x0800), length 65570: (tos 0x0, ttl 252, id 40207, offset 0, flags [+, DF, rsvd], proto UDP (17), length 60951, bad cksum ff (->8336)!)
    18.0.0.15.16896 > 107.95.83.32.68:  [|bootp]
        0x0000:  000c fb49 967e c0ff ff80 009d 0800 4500  ...I.~........E.
        0x0010:  ee17 9d0f e000 fc11 00ff 1200 000f 6b5f  ..............k_
        0x0020:  5320 4200 0044 e800 0514 0000 000d 1400  S.B..D..........
        0x0030:  0000 0d00                                ....
➜  fuzzing_tcpdump
```

크래시가 더이상 안나는 것을 확인할 수 있다.
