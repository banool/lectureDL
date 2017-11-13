import inspect
import io
import shutil
import sys
import time

def retry_until_result(wait_message, delay=0.25, max_retries=20):
    ''' Decorator to retry a function until it doesn't return None.
    As such it obviously relies on the function returning None on failure.
    Any function that waits on something to load should use this decorator.
    Note that in its current form, this reduces generators to be used as
    if they were just regular functions (so don't call next() or anything).
    '''
    def actual_decorator(function):
        def wrapper(*args, **kwargs):
            retries = 0
            print(wait_message)
            is_generator = inspect.isgeneratorfunction(function)
            if is_generator:
                iterator = iter(function(*args, **kwargs))
                # print(str(function) + ' is a generator')
            while True:
                if retries >= max_retries:
                    raise RuntimeError('Max retries exceeded!')
                if not is_generator:
                    result = function(*args, **kwargs)
                else:
                    # Roughly handle if the function is a generator.
                    result = next(iterator)
                retries += 1
                if result is None:
                    time.sleep(delay)
                    continue
                return result
        return wrapper
    return actual_decorator


def show_progress(filehook, pretty_name, localSize, webSize, chunk_size=1024):
    ''' Downloads a file, optionally partially, while showing the progress of
    the download. This download progress is printed on the same line using a
    carriage return. This can mean other lines can sometimes display leftovers
    from this function if the line is shorter than the progress message.
    '''
    fh = filehook
    total_size = webSize
    total_read = localSize
    while True:
        chunk = fh.read(chunk_size)
        if not chunk:
            fh.close()
            break
        total_read += len(chunk)
        print("== Progress (%s):% 5.1f%% ==" % (pretty_name, total_read*100.0/total_size), end="\r", flush=True, file=sys.__stdout__)
        yield chunk


class StdoutSpace(io.TextIOWrapper):
    '''
    Use like:
    sys.stdout = StdoutSpace(sys.stdout)
    '''

    def __init__(self, original_stdout):
        super()
        self.original_stdout = original_stdout
        self.current_line = []

    def write(self, text):
        if not text.endswith('\n'):
            self.current_line.append(text)
        else:
            terminal_width = get_terminal_width()
            string = ''.join(self.current_line)
            spaces = (terminal_width - len(string)) * ' '
            out = string + spaces + '\n'
            self.original_stdout.write(out)
            self.current_line = []

    def flush(self):
        # self.original_stdout.flush()
        pass

def get_terminal_width():
    return shutil.get_terminal_size((80, 20)).columns
