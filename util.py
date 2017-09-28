import sys
import time

def retry_until_result(wait_message, delay=0.25, max_retries=10):
    ''' Decorator to retry a function until it doesn't return None.
    As such it obviously relies on the function returning None on failure.
    Any function that waits on something to load should use this decorator.
    '''
    def actual_decorator(function):
        def wrapper(*args, **kwargs):
            retries = 0
            while True:
                if retries >= max_retries:
                    raise RuntimeError('Max retries exceeded!')
                retries += 1
                result = function(*args, **kwargs)
                if result is None:
                    time.sleep(delay)
                    print(wait_message)
                    continue
                return result
        return wrapper
    return actual_decorator


# Progress bar code from here:
# https://stackoverflow.com/questions/13881092/download-progressbar-for-python-3
# This code is used in the urlretrieve call.
def reporthook(blocknum, blocksize, totalsize):
    readsofar = blocknum * blocksize
    if totalsize > 0:
        percent = readsofar * 1e2 / totalsize
        s = "\r%5.1f%% %*.1f / %.1f MiB " % (
            percent,
            len(str(totalsize)),
            readsofar / 1024 / 1024,
            totalsize / 1024 / 1024,
        )
        sys.stderr.write(s)
        if readsofar >= totalsize: # near the end
            sys.stderr.write("\n")
    else: # total size is unknown
        sys.stderr.write("read %d\n" % (readsofar,))


def show_progress(filehook, localSize, webSize, chunk_size=1024):
    fh = filehook
    total_size = webSize
    total_read = localSize
    while True:
        chunk = fh.read(chunk_size)
        if not chunk:
            fh.close()
            break
        total_read += len(chunk)
        print("== Progress: %0.1f%% ==" % (total_read*100.0/total_size), end="\r", flush=True)
        yield chunk
