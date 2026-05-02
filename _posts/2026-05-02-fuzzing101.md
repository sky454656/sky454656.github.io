---
title: "[Fuzzing101] Exercise 4 - LibTIFF"
date: 2026-05-02
notion_page_id: "351d0542-16a9-8033-a736-eaa6bd3704c7"
notion_order: 6
categories: [블로그/기술문서]
description: "Fuzzing101- Exercise 4"
---
we will fuzz **LibTIFF** image library. The goal is to find a crash/PoC for [**CVE-2016-9297**](https://www.cvedetails.com/cve/CVE-2016-9297/) in libtiff 4.0.4 and **to measure the code coverage data** of your crash/PoC.

**LibTiff 4.0.6 TIFFFetchNormalTag Out-of-Bounds Read Denial of Service Vulnerability**

The TIFFFetchNormalTag function in LibTiff 4.0.6 allows remote attackers to cause a denial of service (out-of-bounds read) via crafted TIFF_SETGET_C16ASCII or TIFF_SETGET_C32_ASCII tag values.

# LibTIFF

`.tif` / `.tiff` 이미지 파일을 프로그램에서 열고, 파싱하고, 저장할 수 있게 해주는 라이브러리

# Do it yourself!

1. Fuzz LibTiff (with ASan enabled) until you have a few unique crashes
1. Triage the crashes to find a PoC for the vulnerability
1. Measure the code coverage of this PoC
1. Fix the issue

# Fuzz

## `LibTiff`  설치 및  일반 빌드

```c
wget https://download.osgeo.org/libtiff/tiff-4.0.4.tar.gz
tar -xzvf tiff-4.0.4.tar.gz
cd tiff-4.0.4/
./configure --prefix="/workspace/fuzz_libtiff/install/" --disable-shared
make -j"$(nproc)"
make install
```

빌드가 잘 되었다.

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-1.png)

## AFL++ LTO + ASan으로 다시 빌드

```c
cd tiff-4.0.4
make distclean || true

	export CC=afl-clang-lto
	export CXX=afl-clang-lto++
	export AFL_USE_ASAN=1

./configure --prefix="/workspace/fuzz_libtiff/install-asan/" --disable-shared
make -j"$(nproc)"
make install
```

## `tiffinfo`  퍼징

```bash
afl-fuzz -m none -i ./tiff-4.0.4/test/images -o out -s 123 -- \
  ./install-asan/bin/tiffinfo -D -j -c -r -s -w @@
```

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-2.png)

# **Code coverage**

테스트나 퍼징을 할 때 프로그램 코드 중 실제로 실행된 부분의 비율/범위

코드 커버리지가 높다는 것은 더 다양한 함수와 분기문을 실행하고, 숨겨진 버그에 도달할 가능성이 커짐

`tiffinfo @@`  라고 하면 기본적인 TIFF 정보만 읽고 끝냄<br>
`tiffinfo -D -j -c -r -s -w @@`  로 옵션을 붙일 경우 더 많은 정보를 출력하려고 여러 처리 루틴을 타서 코드 커버리지가 높아지고, LibTIFF 내부 코드가 더 많이 실행

참고로

```bash
-D  → 디렉터리 정보 처리
-j  → JPEG 관련 정보 처리
-c  → 컬러맵/색상 관련 정보 처리
-r  → raw 데이터 관련 처리
-s  → strip 정보 처리
-w  → warning 관련 출력/처리
```

## LCOV

LCOV : `gcov` 데이터를 모아서 HTML 리포트로 보여주는 도구

`gcov` : GCC의 커버리지 측정 도구

### LCOV용 LibTIFF 빌드

새롭게 빌드를 해준다.

```bash
cd /workspace/fuzz_libtiff/tiff-4.0.4

make distclean 2>/dev/null || true

CFLAGS="--coverage -g -O0" \
LDFLAGS="--coverage" \
./configure --prefix="/workspace/fuzz_libtiff/install-cov" --disable-shared

make -j$(nproc)
make install 
```

```bash
 ./install-cov/bin/tiffinfo -D -j -c -r -s -w  ./tiff-4.0.4/test/images/palette-1c-1b.tiff
```

다음과 같이 실행하고,  소스 디렉터리 안에 `.gcda`, `.gcno` 같은 파일이 생기면 커버리지 데이터가 기록되고 있는 것이다.

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-3.png)

### seed corpus 전체를 실행해서 커버리지 수집

```bash
find ./tiff-4.0.4/test/images -type f \( -name "*.tif" -o -name "*.tiff" \) \
  -exec ./install-cov/bin/tiffinfo -D -j -c -r -s -w {} \; \
  >./tiffinfo_cov.log 2>&1
```

커버리지 빌드된 `tiffinfo` 로 seed 파일들을 실행 하고 로그를  /tiffinfo_cov.log에 저장

### LCOV 리포트 생성

기존 카운터를 초기화한다.

```bash
lcov --directory ./tiff-4.0.4 --zerocounters
```

다시 seed corpus 전체를 실행하고, 커버리지 데이터를 수집한다.

```bash
find ./tiff-4.0.4/test/images -type f \( -name "*.tif" -o -name "*.tiff" \) \
  -exec ./install-cov/bin/tiffinfo -D -j -c -r -s -w {} \; \
  >./tiffinfo_cov.log 2>&1
  
  lcov --capture --directory ./tiff-4.0.4 --output-file coverage.info
```

### HTML 리포트 생성

```bash
genhtml coverage.info --output-directory coverage-html
```

`genhtml` : LCOV tracefile을 HTML 형태로 바꿔주는 도구

`python3 -m http.server 8000 -d coverage-html`

로 열고 [`http://localhost:8000/`](http://localhost:8000/) 로 접속해서 확인

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-4.png)

`test/images`에 있는 seed들을 전부 `tiffinfo -D -j -c -r -s -w`로 실행했을 때 도달한 코드 커버리

### AFL 결과 corpus로 커버리지 재측정

앞에서 했던 퍼징을 이용해 커버리지를 재측정 해본다.

```bash
lcov --directory ./tiff-4.0.4 --zerocounters
```

```bash
find ./out/queue -type f \
-exec ./install-cov/bin/tiffinfo -D -j -c -r -s -w {} \; \
  >./tiffinfo_afl_queue_cov.log2>&1
```

```bash
lcov --capture --directory ./tiff-4.0.4 --output-file afl_queue_coverage.info
genhtml afl_queue_coverage.info --output-directory afl-coverage-html
```

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-5.png)

초기 seed만 실했했을 때보다 커버리지가 상승한 것을 확인할  수 있다.

### 커버리지 활용법

파일별/함수별/라인별로 실행된 곳과 안 된 곳 확인 가능

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-6.png)

#### 실행 옵션 개선

예 `tiffinfo @@`만 썼을 때보다

```bash
./install-asan/bin/tiffinfo -D -j -c -r -s -w @@
```

처럼 옵션을 붙일 경우 더 많은 출력/파싱 코드가 실행

커버리지 리포트에서 `tif_print.c`, `tif_dirread.c`, `tif_jpeg.c`, `tif_luv.c`, `tif_strip.c` 같은 파일의 커버리지가 낮다면, 해당 기능을 타는 옵션이나 입력 샘플을 추가하는 방식으로 개선

#### seed corpus 개선

LCOV에서 특정 TIFF 기능 관련 코드가 거의 실행되지 않는다면, 그 기능을 포함한 TIFF 샘플을 seed에 추가합니다.

```bash
커버되지 않는 코드가 JPEG 압축 TIFF 관련
→ JPEG-compressed TIFF seed 추가

커버되지 않는 코드가 tiled image 관련
→ tiled TIFF seed 추가

커버되지 않는 코드가 palette/color map 관련
→ palette TIFF seed 추가

커버되지 않는 코드가 multi-page directory 관련
→ multi-page TIFF seed 추가
```

seed corpus는 서로 다른 구조의 TIFF 파일을 포함하는 것이 더 중요

#### 타깃 바이너리 변경 또는 추가

`tiffinfo`가 도달하지 못하는 코드가 많다면 다른 LibTIFF tool도 퍼징 대상으로 추가

ex)

```bash
tiffcp @@ /tmp/out.tiff
```

`tiffcp`는 읽기 + 쓰기/변환 경로를 더 많이 탈 수 있다

커버리지 리포트에서 write/encoding 관련 코드가 비어 있으면 `tiffcp`를 별도 타깃으로 퍼징하는 것이 도움됨.

#### dictionary 사용

dictionary : 이 파일 포맷에서 자주 나오는 중요한 바이트/문자열 조각을 미리 알려주는 파일

예를 들어 TIFF 파일 같은 경우 다음과 같은 포맷 사용

```plaintext
TIFF magic bytes
태그 번호
필드 타입
길이 값
offset 값
압축 방식 값
색상 관련 값
```

```plaintext
"II"
"MM"
"\x2a\x00"
"\x00\x2a"
"\x01\x00"
"\x02\x00"
"\x03\x00"
"\x04\x00"
"\x05\x00"
```

위처럼 dictonary파일을 주면 AFL이 변이할 때 그 값들을 삽입하거나 교체하면서 더 유효한 TIFF 구조를 만들 가능성이 올라감.

```plaintext
afl-fuzz -m none \
  -i ./tiff-4.0.4/test/images \
  -o out \
  -s 123 \
  -x tiff.dict -- \
  ./install-asan/bin/tiffinfo -D -j -c -r -s -w @@
```

이런 형태로 사용

# Triage

```bash
==1833==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x602000000071 at pc 0x0000002aa022 bp 0x7ffe5ce435f0 sp 0x7ffe5ce42db0
READ of size 2 at 0x602000000071 thread T0
    #0 0x2aa021 in fputs (/workspace/fuzz_libtiff/install-asan/bin/tiffinfo+0x2aa021)
    #1 0x47aec3 in _TIFFPrintField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_print.c:127:4
    #2 0x47aec3 in TIFFPrintDirectory /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_print.c:641:5
    #3 0x33cbff in tiffinfo /workspace/fuzz_libtiff/tiff-4.0.4/tools/tiffinfo.c:449:2
    #4 0x33c215 in main /workspace/fuzz_libtiff/tiff-4.0.4/tools/tiffinfo.c:152:6
    #5 0x79ee9ca5f082 in __libc_start_main /build/glibc-B3wQXB/glibc-2.31/csu/../csu/libc-start.c:308:16
    #6 0x29088d in _start (/workspace/fuzz_libtiff/install-asan/bin/tiffinfo+0x29088d)

0x602000000071 is located 0 bytes to the right of 1-byte region [0x602000000070,0x602000000071)
allocated by thread T0 here:
    #0 0x30a55d in malloc (/workspace/fuzz_libtiff/install-asan/bin/tiffinfo+0x30a55d)
    #1 0x3557d5 in _TIFFmalloc /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_unix.c:283:10
    #2 0x3557d5 in setByteArray /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:51:19
    #3 0x3557d5 in _TIFFVSetField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:539:4
    #4 0x349359 in TIFFVSetField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:820:6
    #5 0x349359 in TIFFSetField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:764:11
    #6 0x3825d7 in TIFFFetchNormalTag /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dirread.c:5164:8
    #7 0x375dfe in TIFFReadDirectory /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dirread.c:3810:12
    #8 0x437868 in TIFFClientOpen /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_open.c:466:8
    #9 0x49089a in TIFFFdOpen /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_unix.c:178:8
    #10 0x49089a in TIFFOpen /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_unix.c:217:8

SUMMARY: AddressSanitizer: heap-buffer-overflow (/workspace/fuzz_libtiff/install-asan/bin/tiffinfo+0x2aa021) in fputs
Shadow bytes around the buggy address:
  0x0c047fff7fb0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c047fff7fc0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c047fff7fd0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c047fff7fe0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c047fff7ff0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
=>0x0c047fff8000: fa fa 00 00 fa fa fd fa fa fa fd fa fa fa[01]fa
  0x0c047fff8010: fa fa fd fa fa fa 00 fa fa fa fd fa fa fa 00 fa
  0x0c047fff8020: fa fa fd fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c047fff8030: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c047fff8040: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x0c047fff8050: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
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
  Shadow gap:              cc
==1833==ABORTING
```

- 오류 유형 : `heap-buffer-overflow`
- 접근 종류 : `READ of size 2 at 0x602000000071 thread T0`

`fputs` 에서 크래시 발생

- 실제 발생지점 : 

`_TIFFPrintField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_print.c:127:4`

- 실제 호출 흐름 : 

`fputs` →` _TIFFPrintField` → `TIFFPrintDirectory` →` tiffinfo` → `main`

```bash
 gdb --args ./install-asan/bin/tiffinfo -D -j -c -r -s -w ./out/crashes/id:000000,sig:06,src:000000,time:42020,op:arith16,pos:55,val:-2
set follow-fork-mode parent
set detach-on-fork on
set environment ASAN_OPTIONS abort_on_error=1:symbolize=0:detect_leaks=0
```

```bash
==1826==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x602000000071 at pc 0x0000002aa022 bp 0x7fffffffe110 sp 0x7fffffffd8d0
READ of size 2 at 0x602000000071 thread T0
```

```bash
pwndbg> bt
#0  __GI_raise (sig=sig@entry=6) at ../sysdeps/unix/sysv/linux/raise.c:50
#1  0x00007ffff7c20859 in __GI_abort () at abort.c:79
#2  0x0000000000328277 in __sanitizer::Abort() ()
#3  0x0000000000326bf1 in __sanitizer::Die() ()
#4  0x000000000030e5c4 in __asan::ScopedInErrorReport::~ScopedInErrorReport() ()
#5  0x000000000031007e in __asan::ReportGenericError(unsigned long, unsigned long, unsigned long, unsigned long, bool, unsigned long, unsigned int, bool) ()
#6  0x00000000002aa041 in fputs ()
#7  0x000000000047aec4 in _TIFFPrintField (fd=0x7ffff7deb6a0 <_IO_2_1_stdout_>, fip=<optimized out>, value_count=<optimized out>, raw_data=0x602000000070) at tif_print.c:127
#8  TIFFPrintDirectory (tif=<optimized out>, fd=<optimized out>, flags=<optimized out>) at tif_print.c:641
#9  0x000000000033cc00 in tiffinfo (tif=<optimized out>, order=<optimized out>, flags=<optimized out>, is_image=<optimized out>) at tiffinfo.c:449
#10 0x000000000033c216 in main (argc=<optimized out>, argv=<optimized out>) at tiffinfo.c:152
#11 0x00007ffff7c22083 in __libc_start_main (main=0x33b640 <main>, argc=8, argv=0x7fffffffe598, init=<optimized out>, fini=<optimized out>, rtld_fini=<optimized out>, stack_end=0x7fffffffe588) at ../csu/libc-start.c:308
#12 0x000000000029088e in _start ()
pwndbg>
```

## frame 7

```bash
pwndbg> frame 7
#7  0x000000000047aec4 in _TIFFPrintField (fd=0x7ffff7deb6a0 <_IO_2_1_stdout_>, fip=<optimized out>, value_count=<optimized out>, raw_data=0x602000000070) at tif_print.c:127
127                             fprintf(fd, "%s", (char *) raw_data);
pwndbg> info locals
j = 0
pwndbg> list
122                     else if(fip->field_type == TIFF_FLOAT)
123                             fprintf(fd, "%f", ((float *)raw_data)[j]);
124                     else if(fip->field_type == TIFF_DOUBLE)
125                             fprintf(fd, "%f", ((double *) raw_data)[j]);
126                     else if(fip->field_type == TIFF_ASCII) {
127                             fprintf(fd, "%s", (char *) raw_data);
128                             break;
129                     }
130                     else {
131                             fprintf(fd, "<unsupported data type in TIFFPrint>");
pwndbg> x/gx raw_data
0x602000000070: 0x0000000000000074
```

`else if(fip->field_type == TIFF_ASCII) {<br>
127                             fprintf(fd, "%s", (char *) raw_data);`

asan 로그의

`0x602000000071 is located 0 bytes to the right of 1-byte region [0x602000000070,0x602000000071)`

`0x602000000070` 에 1바이트 영역 할당

`0x602000000071` , 즉 할당된 바로 다음 영역을 읽으려고 함.

`raw_data`가 1바이트만 할당된 heap 버퍼인데, `_TIFFPrintField()`가 이를 null-terminated ASCII 문자열로 간주하고 `%s`로 출력

해당 메모리가 어디서 할당되었는지 확인해본다

```bash
 #0 0x30a55d in malloc (/workspace/fuzz_libtiff/install-asan/bin/tiffinfo+0x30a55d)
 #1 0x3557d5 in _TIFFmalloc /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_unix.c:283:10
 #2 0x3557d5 in setByteArray /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:51:19
 #3 0x3557d5 in _TIFFVSetField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:539:4
 #4 0x349359 in TIFFVSetField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:820:6
 #5 0x349359 in TIFFSetField /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dir.c:764:11
 #6 0x3825d7 in TIFFFetchNormalTag /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dirread.c:5164:8
 #7 0x375dfe in TIFFReadDirectory /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_dirread.c:3810:12
 #8 0x437868 in TIFFClientOpen /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_open.c:466:8
 #9 0x49089a in TIFFFdOpen /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_unix.c:178:8
 #10 0x49089a in TIFFOpen /workspace/fuzz_libtiff/tiff-4.0.4/libtiff/tif_unix.c:217:8
```

### tif_dirread.c:5164

```bash
break tif_dirread.c:5164
run
```

```bash
pwndbg> list
5159                                    assert(fip->field_passcount==1);
5160                                    err=TIFFReadDirEntryByteArray(tif,dp,&data);
5161                                    if (err==TIFFReadDirEntryErrOk)
5162                                    {
5163                                            int m;
5164                                            m=TIFFSetField(tif,dp->tdir_tag,(uint32)(dp->tdir_count),data);
5165                                            if (data!=0)
5166                                                    _TIFFfree(data);
5167                                            if (!m)
5168                                                    return(0);
pwndbg> info locals
module = "TIFFFetchNormalTag"
fip = 0x604000000010
fii = <optimized out>
err = TIFFReadDirEntryErrOk
pwndbg> p fip->set_field_type
$12 = TIFF_SETGET_C32_ASCII
pwndbg>p dp->tdir_tag
$13 = 65283
pwndbg> p dp->tdir_count
$14 = 1
pwndbg>
```

본 취약점 분석 과정에서 ASAN 계측 바이너리를 GDB로 확인했으나, AFL-LTO 및 ASAN 계측으로 인해 일부 지역 변수와 함수 프레임이 `<optimized out>`으로 표시되거나 `_TIFFPrintField()` 프레임이 `TIFFPrintDirectory()`로 합쳐져 보이는 문제가 있었다. 따라서 세부 인자 값은 GDB에서 모두 직접 확인하기보다는, ASAN 로그와 LibTIFF 소스코드 흐름을 함께 분석하는 방식으로 원인을 추적하였다.

```c
	case TIFF_SETGET_C32_ASCII:
			{
				uint8* data;
				assert(fip->field_readcount==TIFF_VARIABLE2);
				assert(fip->field_passcount==1);
				err=TIFFReadDirEntryByteArray(tif,dp,&data);
				if (err==TIFFReadDirEntryErrOk)
				{
					int m;
					m=TIFFSetField(tif,dp->tdir_tag,(uint32)(dp->tdir_count),data);
					if (data!=0)
						_TIFFfree(data);
					if (!m)
						return(0);
				}
			}
```

`TIFFFetchNormalTag()`  함수에서 `TIFF_SETGET_C32_ASCII`  태크 처리.

`TIFFSetField`  함수에 태그 데이터를 전달한다.

`dp->tdir_tag =65283`,  `dp->tdir_count = 1`

이 `tdir_count = 1` 이 1바이트 malloc으로 이어지며, 출력 단계에서 해당 버퍼가 ASCII 문자열처럼 처리

해당 값이 실제로 1바이트 malloc으로 이어지는지 확인해보자

### TIFFSetField, TIFFVSetField

코드흐름

```c
int
TIFFSetField(TIFF* tif, uint32 tag, ...)
{
	va_list ap;
	int status;

	va_start(ap, tag);
	status = TIFFVSetField(tif, tag, ap);
	va_end(ap);
	return (status);
}
```

ap의 첫번째 가변 인자 = `dp->tdir_count`

```c
int
TIFFVSetField(TIFF* tif, uint32 tag, va_list ap)
{
	return OkToChangeTag(tif, tag) ?
	    (*tif->tif_tagmethods.vsetfield)(tif, tag, ap) : 0;
}
```

로그를 참고할 때, 여기서 `(*tif->tif_tagmethods.vsetfield)(tif, tag, ap)`  가 `_TIFFVSetField`

![[Fuzzing101] Exercise 4 - LibTIFF](/assets/img/posts/fuzzing101/2026-05-02-fuzzing101-7.png)

확인해보니 맞다

### _TIFFVSetField , setByteArray

```c
static int
_TIFFVSetField(TIFF* tif, uint32 tag, va_list ap)
{
...

			if (fip->field_type == TIFF_ASCII)
		{
			uint32 ma;
			char* mb;
			if (fip->field_passcount)
			{
				assert(fip->field_writecount==TIFF_VARIABLE2);
				ma=(uint32)va_arg(ap,uint32);
				mb=(char*)va_arg(ap,char*);
			}
			else
			{
				mb=(char*)va_arg(ap,char*);
				ma=(uint32)(strlen(mb)+1);
			}
			tv->count=ma;
			setByteArray(&tv->value,mb,ma,1);
		}

}
```

`ma`  가 `dp->tdir_count`  가 되는 것을 확인할 수 있다.

```c
setByteArray(void** vpp, void* vp, size_t nmemb, size_t elem_size)
{
	if (*vpp)
		_TIFFfree(*vpp), *vpp = 0;
	if (vp) {
		tmsize_t bytes = (tmsize_t)(nmemb * elem_size);
		if (elem_size && bytes / elem_size == nmemb)
			*vpp = (void*) _TIFFmalloc(bytes);
		if (*vpp)
			_TIFFmemcpy(*vpp, vp, bytes);
	}
}
```

`nmemb * elem_size` 만큼 malloc을 하는데, 이게 `elem_size = 1`  이므로 결국 1바이트 할당

# fix the issue

문제 발생 조건

`ip->field_type == TIFF_ASCII`

저장된 ma 바이트 안에 `NULL`이 없음

`fprintf("%s", raw_data)`로 출력

```c
if (fip->field_type == TIFF_ASCII)
		{
			uint32 ma;
			char* mb;
			if (fip->field_passcount)
			{
				assert(fip->field_writecount==TIFF_VARIABLE2);
				ma=(uint32)va_arg(ap,uint32);
				mb=(char*)va_arg(ap,char*);
			}
			else
			{
				mb=(char*)va_arg(ap,char*);
				ma=(uint32)(strlen(mb)+1);
			}
			
			tv->count=ma;
			setByteArray(&tv->value,mb,ma,1);
		}
```

TIFF_ASCII 타입은 문자열 데이터로 처리되므로 정상적인 값이라면 `NULL`로 종료되어야 한다.

그렇기 때문에 배열의 마지막을 강제로 `NULL` 을 삽입하여 패치를 해보았다.

```c
if (fip->field_type == TIFF_ASCII)
		{
			uint32 ma;
			char* mb;
			if (fip->field_passcount)
			{
				assert(fip->field_writecount==TIFF_VARIABLE2);
				ma=(uint32)va_arg(ap,uint32);
				mb=(char*)va_arg(ap,char*);
			}
			else
			{
				mb=(char*)va_arg(ap,char*);
				ma=(uint32)(strlen(mb)+1);
			}
			
			tv->count=ma;
			setByteArray(&tv->value,mb,ma,1);
			
			if (ma > 0 && tv->value != NULL)
        ((char*)tv->value)[ma - 1] = '\0';
		}
```

```c
root@a7782848703c:/workspace/fuzz_libtiff# ./install-asan/bin/tiffinfo -D -j -c -r -s -w ./out/crashes/id:000000,sig:06,src:000000,time:42020,op:arith16,pos:55,val:-2
TIFFReadDirectoryCheckOrder: Warning, Invalid TIFF directory; tags are not sorted in ascending order.
TIFFReadDirectory: Warning, Unknown field with tag 65283 (0xff03) encountered.
TIFF Directory at offset 0x10 (16)
  Image Width: 1 Image Length: 1
  Bits/Sample: 16
  Sample Format: signed integer
  Compression Scheme: None
  Photometric Interpretation: CIE Log2(L) (u',v')
  Samples/Pixel: 3
  Rows/Strip: 682
  Planar Configuration: single image plane
  Tag 65283:
  1 Strips:
      0: [       8,        8]
root@a7782848703c:/workspace/fuzz_libtiff#
```

다만 마지막 바이트를 덮어쓰기 때문에 malformed ASCII 데이터의 일부가 손실될 수 있다.
